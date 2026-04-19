import { nodeMailerClient } from "../../libs/email/node-mailer-client";
import { MailerService } from "./mailer.service";

export const mailerService = new MailerService(nodeMailerClient);
