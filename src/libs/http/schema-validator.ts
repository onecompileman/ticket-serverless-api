import { ZodObject, ZodError } from 'zod';
import { StatusCode } from '../enums/status-code.enum';
import { httpResponse } from './response';

export const zodValidator = (schema: ZodObject<any>) => ({
  before: async (request: any) => {
    try {
      request.event.body = schema.parse(request.event.body);
    } catch (err) {
      if (err instanceof ZodError) {
        // Stop pipeline and return a proper 400 response
        request.response = httpResponse(
          {
            message: 'Validation failed',
            errors: err.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            })),
          },
          { statusCode: StatusCode.BAD_REQUEST }
        );
        return;
      }

      request.response = httpResponse(
        { message: 'Bad request' },
        { statusCode: StatusCode.BAD_REQUEST }
      );
    }
  },
});