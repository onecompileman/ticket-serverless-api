import { Transporter } from 'nodemailer';

export class MailerService {
    constructor(private readonly mailerClient: Transporter) {}

    async sendEmail(to: string, subject: string, text: string): Promise<void> {
        await this.mailerClient.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject,
            html: text,
        });
    }
}

