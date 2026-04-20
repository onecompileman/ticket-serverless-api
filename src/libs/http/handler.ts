import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const baseHandler = (handler: any) =>
    middy(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 204,
                body: '',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Methods': '*',
                },
            };
        }

        return handler(event, context);
    })
        .use(httpCors())
        .use(httpJsonBodyParser({ disableContentTypeError: true }));