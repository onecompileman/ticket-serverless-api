import { EmailTemplate } from "../enums/email-template.enum"
import { BoardCreateFailedEmailData } from "../models/email-models/board-create-failed.model"
import { BoardCreatedEmailData } from "../models/email-models/board-created.model"
import { BoardInvitationEmailData } from "../models/email-models/board-invitation.model"

export const EmailTemplateTypeModel: {
    [key in EmailTemplate]: any
} = {
    [EmailTemplate.BOARD_INVITATION]: BoardInvitationEmailData,
    [EmailTemplate.BOARD_CREATED]: BoardCreatedEmailData,
    [EmailTemplate.BOARD_CREATE_FAILED]: BoardCreateFailedEmailData,
}