import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpJsonBodyParser from '@middy/http-json-body-parser';

export const baseHandler = (handler: any) =>
    middy(handler)
        .use(httpCors())
        .use(httpJsonBodyParser({ disableContentTypeError: true }));