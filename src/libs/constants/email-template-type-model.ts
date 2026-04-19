import { EmailTemplate } from "../enums/email-template.enum"
import { BoardInvitationEmailData } from "../models/email-models/board-invitation.model"

export const EmailTemplateTypeModel: {
    [key in EmailTemplate]: any
} = {
   [EmailTemplate.BOARD_INVITATION]: BoardInvitationEmailData
}