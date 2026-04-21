import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { baseHandler } from '../../libs/http/handler';
import { httpResponse, httpError } from '../../libs/http/response';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';

const lambdaPath = '/import/board-json/start';
const lambdaMethod = 'post';

const sfnClient = new SFNClient({});

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const body = event.body as any;

            const stateMachineArn = process.env.BOARD_JSON_IMPORT_STATE_MACHINE_ARN;
            if (!stateMachineArn) {
                return httpError('State machine ARN is not configured', {
                    statusCode: StatusCode.INTERNAL_SERVER_ERROR,
                });
            }

            const importInput = {
                created_by_id: user.id,
                creator_email: user.email,
                creator_name: user.full_name,
                board: body.board,
                columns: body.columns,
                tickets: body.tickets,
                invite_emails: body.invite_emails,
            };

            const command = new StartExecutionCommand({
                stateMachineArn,
                input: JSON.stringify(importInput),
            });

            const result = await sfnClient.send(command);

            return httpResponse(
                {
                    executionArn: result.executionArn,
                    startDate: result.startDate,
                },
                { statusCode: StatusCode.ACCEPTED },
            );
        } catch (err) {
            return httpError(err instanceof Error ? err.message : 'Failed to start import', {
                statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    },
);

lambdaHandler.use(authMiddleware());
