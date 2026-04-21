import { EmailTemplateTypeModel } from '../../libs/constants/email-template-type-model';
import { EmailTemplate } from '../../libs/enums/email-template.enum';
import { MailerService } from '../mailer/mailer.service';
import { getClassProperties } from '../../libs/utils/get-class-properties';
import { access, readFile } from 'fs/promises';
import path from 'path';
import boardInvitationTemplateAssetPath from '../../email-templates/board-invitation-template.html';
import boardCreatedTemplateAssetPath from '../../email-templates/board-created-template.html';
import boardCreateFailedTemplateAssetPath from '../../email-templates/board-create-failed-template.html';

const TEMPLATE_ASSET_PATHS: Record<EmailTemplate, string> = {
    [EmailTemplate.BOARD_INVITATION]: boardInvitationTemplateAssetPath,
    [EmailTemplate.BOARD_CREATED]: boardCreatedTemplateAssetPath,
    [EmailTemplate.BOARD_CREATE_FAILED]: boardCreateFailedTemplateAssetPath,
};

export class EmailTemplateService {
    constructor(private readonly emailService: MailerService) {}

    async sendEmailByTemplate(to: string, subject: string, template: EmailTemplate, data: any): Promise<void> {
        const templateClass = EmailTemplateTypeModel[template];
        const templateInstance = new templateClass();
        const templateProperties = getClassProperties(templateInstance);
        const missingProperties = templateProperties.filter((prop) => !(prop in data));

        if (missingProperties.length > 0) {
            throw new Error(`Missing properties for template ${template}: ${missingProperties.join(', ')}`);
        }

        const templateString = await this.getTemplateAsString(template);
        const emailContent = this.applyTemplateData(templateString, data);
        await this.emailService.sendEmail(to, subject, emailContent);
    }

    private async getTemplateAsString(template: EmailTemplate): Promise<string> {
        const filePath = await this.resolveTemplateFilePath(template);
        return readFile(filePath, 'utf8');
    }

    private async resolveTemplateFilePath(template: EmailTemplate): Promise<string> {
        const fileName = `${template}-template.html`;
        const assetPath = TEMPLATE_ASSET_PATHS[template];
        const templateCandidatePaths = [
            path.resolve(process.cwd(), 'src', 'email-templates', fileName),
            path.resolve(process.cwd(), 'email-templates', fileName),
            path.resolve(__dirname, assetPath)
        ];

        for (const candidatePath of templateCandidatePaths) {
            try {
                await access(candidatePath);
                return candidatePath;
            } catch {
                // Try the next candidate path.
            }
        }

        throw new Error(`Email template file not found for ${template}. Tried: ${templateCandidatePaths.join(', ')}`);
    }

    private applyTemplateData(templateString: string, data: Record<string, unknown>): string {
        return templateString.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
            const value = data[key];
            return value == null ? '' : String(value);
        });
    }
}
