import nodemailer from 'nodemailer';

export const nodeMailerClient = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use true for port 465
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
