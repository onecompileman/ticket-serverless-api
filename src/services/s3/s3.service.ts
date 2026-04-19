import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3Service {
    constructor(private readonly s3Client: S3Client, private readonly bucketName: string) {}

    async uploadFile(file: File, path: string): Promise<string> {
        const key = `${path}/${Date.now()}_${file.name}`;
        const body = await file.arrayBuffer();

        const uploadParams: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: `${key}`,
            Body: Buffer.from(body),
            ContentType: file.type,
        };

        await this.s3Client.send(new PutObjectCommand(uploadParams));
        return key;
    }

    async uploadBuffer(
        content: Buffer,
        path: string,
        fileName: string,
        contentType?: string,
    ): Promise<string> {
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${path}/${Date.now()}_${safeName}`;

        const uploadParams: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            Body: content,
            ContentType: contentType,
        };

        await this.s3Client.send(new PutObjectCommand(uploadParams));
        return key;
    }

    async deleteFile(key: string): Promise<void> {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
    }

    async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
        return url;
    }
}
