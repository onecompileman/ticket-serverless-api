import { S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { Ticket, TicketAttachment } from '../entities';
import { addTicketAttachmentSchema, createTicketSchema, CreateTicketDto } from '../schemas';
import { S3Service } from '../services/s3/s3.service';
import {
    TicketAttachmentInput,
    TicketAttachmentDto,
    TicketService,
    TicketSubtaskInput,
    TicketWithDetails,
} from '../services/ticket/ticket.service';

type AttachmentFormInput = string | { file_url: string };
type SubtaskFormInput = string | { task: string; is_completed?: boolean };

type CreateTicketPayload = CreateTicketDto & {
    attachments?: AttachmentFormInput[];
    subtasks?: SubtaskFormInput[];
};

type MultipartFile = {
    fieldName: string;
    fileName: string;
    contentType?: string;
    content: Buffer;
};

type ParsedCreateTicketInput = {
    payload: CreateTicketPayload;
    attachmentFiles: MultipartFile[];
};

const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

export class TicketFacade {
    private readonly s3Service: S3Service;

    constructor(private readonly ticketService: TicketService) {
        const bucketName = process.env.S3_BUCKET_NAME || 'ticket-storage-843232831760-ap-southeast-2-an';
        this.s3Service = new S3Service(new S3Client({ region: 'ap-southeast-2' }), bucketName);
    }

    async parseCreateTicketInput(event: APIGatewayProxyEvent): Promise<ParsedCreateTicketInput> {
        if (this.isMultipartRequest(event)) {
            const { fields, files } = this.parseMultipartFormData(event);
            const payload = createTicketSchema.parse(fields) as CreateTicketPayload;

            return {
                payload,
                attachmentFiles: files.filter((file) => file.fieldName === 'attachments'),
            };
        }

        return {
            payload: createTicketSchema.parse(event.body) as CreateTicketPayload,
            attachmentFiles: [],
        };
    }

    async createTicket(payload: CreateTicketPayload, userId: number, attachmentFiles: MultipartFile[] = []): Promise<TicketWithDetails> {
        const subtasks = this.normalizeSubtasks(payload.subtasks);

        const ticket = await this.ticketService.addTicket({
            board: { id: payload.board_id },
            assigned_user: { id: payload.assigned_user_id },
            created_by: { id: userId },
            sys_id: uuid(),
            title: payload.title,
            description: payload.description,
            acceptance_criteria: payload.acceptance_criteria,
            priority: payload.priority,
            sort_order: payload.sort_order,
            column: { id: payload.column_id },
        } as Ticket);

        const uploadedAttachmentKeys = await this.uploadMultipartAttachments(ticket.id, attachmentFiles);
        const attachments = this.normalizeAttachments([...(payload.attachments ?? []), ...uploadedAttachmentKeys]);

        await Promise.all([
            this.ticketService.addSubtasks(ticket.id, userId, subtasks),
            this.ticketService.addAttachments(ticket.id, userId, attachments),
        ]);

        const createdTicket = await this.ticketService.getTicketByIdWithDetails(ticket.id);

        if (!createdTicket) {
            throw new Error('Failed to load created ticket');
        }

        const signedAttachments = await this.toSignedAttachmentDtos(createdTicket.attachments);

        return {
            ...createdTicket,
            attachments: signedAttachments,
        };
    }

    async getTicketByIdWithSignedAttachments(ticketId: number): Promise<TicketWithDetails | null> {
        const ticket = await this.ticketService.getTicketByIdWithDetails(ticketId);

        if (!ticket) {
            return null;
        }

        const signedAttachments = await this.toSignedAttachmentDtos(ticket.attachments);

        return {
            ...ticket,
            attachments: signedAttachments,
        };
    }

    private async toSignedAttachmentDtos(attachments: TicketAttachment[]): Promise<TicketAttachmentDto[]> {
        return Promise.all(
            attachments.map(async (attachment) => ({
                ...attachment,
                file_name: this.extractSafeName(attachment.file_url),
                file_url: await this.s3Service.getSignedUrl(attachment.file_url),
            })),
        );
    }

    private normalizeAttachments(attachments?: AttachmentFormInput[]): TicketAttachmentInput[] {
        if (!attachments?.length) {
            return [];
        }

        return attachments
            .map((attachment) => (typeof attachment === 'string' ? { file_url: attachment } : attachment))
            .map((attachment) => ({ file_url: `${attachment.file_url}`.trim() }))
            .filter((attachment) => Boolean(attachment.file_url));
    }

    private normalizeSubtasks(subtasks?: SubtaskFormInput[]): TicketSubtaskInput[] {
        if (!subtasks?.length) {
            return [];
        }

        return subtasks
            .map((subtask) => (typeof subtask === 'string' ? { task: subtask, is_completed: false } : subtask))
            .map((subtask) => ({
                task: `${subtask.task}`.trim(),
                is_completed: Boolean(subtask.is_completed),
            }))
            .filter((subtask) => Boolean(subtask.task));
    }

    private async uploadMultipartAttachments(ticketId: number, files: MultipartFile[]): Promise<string[]> {
        if (!files.length) {
            return [];
        }

        return Promise.all(
            files.map((file) =>
                this.s3Service.uploadBuffer(
                    file.content,
                    `tickets/${ticketId}/attachments`,
                    file.fileName,
                    file.contentType,
                ),
            ),
        );
    }

    private isMultipartRequest(event: APIGatewayProxyEvent): boolean {
        const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'];
        return typeof contentType === 'string' && contentType.toLowerCase().includes('multipart/form-data');
    }

    private parseMultipartFormData(event: APIGatewayProxyEvent): { fields: Record<string, unknown>; files: MultipartFile[] } {
        const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
        const boundary = this.extractBoundary(contentType);

        if (!boundary) {
            throw new Error('Invalid multipart form-data: missing boundary');
        }

        if (!event.body) {
            return { fields: {}, files: [] };
        }

        const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8');
        const boundaryToken = `--${boundary}`;
        const body = bodyBuffer.toString('latin1');

        const parts = body.split(boundaryToken).slice(1, -1);
        const fields: Record<string, unknown> = {};
        const files: MultipartFile[] = [];

        for (const rawPart of parts) {
            let part = rawPart;

            if (part.startsWith('\r\n')) {
                part = part.slice(2);
            }

            if (part.endsWith('\r\n')) {
                part = part.slice(0, -2);
            }

            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) {
                continue;
            }

            const rawHeaders = part.slice(0, headerEnd);
            const rawValue = part.slice(headerEnd + 4);
            const headers = this.parsePartHeaders(rawHeaders);
            const disposition = headers['content-disposition'] || '';
            const rawFieldName = this.extractHeaderValue(disposition, 'name');

            if (!rawFieldName) {
                continue;
            }

            const fieldName = this.normalizeArrayFieldName(rawFieldName);

            const fileName = this.extractHeaderValue(disposition, 'filename');
            const contentBuffer = Buffer.from(rawValue, 'latin1');

            if (fileName) {
                if (fieldName === 'attachments' && contentBuffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
                    throw new Error(`Attachment ${fileName} exceeds the 3MB limit`);
                }

                files.push({
                    fieldName,
                    fileName,
                    contentType: headers['content-type'],
                    content: contentBuffer,
                });
                continue;
            }

            const value = contentBuffer.toString('utf8');
            const existing = fields[fieldName];

            if (existing === undefined) {
                fields[fieldName] = value;
                continue;
            }

            if (Array.isArray(existing)) {
                fields[fieldName] = [...existing, value];
                continue;
            }

            fields[fieldName] = [existing, value];
        }

        return { fields, files };
    }

    private extractBoundary(contentType: string): string | null {
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        return (match?.[1] || match?.[2] || '').trim() || null;
    }

    private parsePartHeaders(rawHeaders: string): Record<string, string> {
        return rawHeaders
            .split('\r\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .reduce<Record<string, string>>((acc, line) => {
                const separator = line.indexOf(':');
                if (separator === -1) {
                    return acc;
                }

                const key = line.slice(0, separator).trim().toLowerCase();
                const value = line.slice(separator + 1).trim();
                acc[key] = value;
                return acc;
            }, {});
    }

    private extractHeaderValue(headerValue: string, key: string): string | null {
        const regex = new RegExp(`${key}="([^"]*)"`, 'i');
        const match = headerValue.match(regex);
        return match?.[1] ?? null;
    }

    private normalizeArrayFieldName(fieldName: string): string {
        return fieldName.endsWith('[]') ? fieldName.slice(0, -2) : fieldName;
    }

    private extractSafeName(key: string): string {
        const segment = key.split('/').pop() ?? '';
        return segment.replace(/^\d+_/, '');
    }

    async parseAddAttachmentInput(event: APIGatewayProxyEvent): Promise<{ fileUrl?: string; file?: MultipartFile }> {
        if (this.isMultipartRequest(event)) {
            const { files } = this.parseMultipartFormData(event);
            const file = files.find((f) => f.fieldName === 'file');
            return { file };
        }

        const body = addTicketAttachmentSchema.parse(event.body);
        return { fileUrl: body.file_url };
    }

    async addAttachmentToTicket(
        ticketId: number,
        userId: number,
        input: { fileUrl?: string; file?: MultipartFile },
    ): Promise<TicketAttachmentDto[]> {
        let fileUrl: string;

        if (input.file) {
            const keys = await this.uploadMultipartAttachments(ticketId, [input.file]);
            fileUrl = keys[0];
        } else if (input.fileUrl) {
            fileUrl = input.fileUrl;
        } else {
            throw new Error('No attachment provided');
        }

        const attachments = await this.ticketService.addAttachments(ticketId, userId, [{ file_url: fileUrl }]);
        return this.toSignedAttachmentDtos(attachments);
    }
}
