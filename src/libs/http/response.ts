import { APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../enums/status-code.enum';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
};



export function httpResponse<T>(
    response: Record<string, unknown> | Record<string, unknown>[] | T[] | T,
    { statusCode = StatusCode.OK, ...rest }: Omit<APIGatewayProxyResult, 'body'> = {
        statusCode: StatusCode.OK,
    },
): APIGatewayProxyResult {
    const headers = { ...CORS_HEADERS, ...(rest.headers ?? {}) };

    return {
        body: JSON.stringify(response),
        statusCode,
        ...rest,
        headers,
    };
}

/**
 * @deprecated - please use @httpServerError function below
 */
export function httpError(
    error: unknown,
    { statusCode = StatusCode.INTERNAL_SERVER_ERROR, ...rest }: Omit<APIGatewayProxyResult, 'body'> = {
        statusCode: StatusCode.INTERNAL_SERVER_ERROR,
    },
): APIGatewayProxyResult {
    const headers = { ...CORS_HEADERS, ...(rest.headers ?? {}) };

    return {
        body: JSON.stringify(typeof error === 'string' ? { message: error, status: statusCode } : error),
        statusCode,
        ...rest,
        headers,
    };
}

/**
 * Returns http error as valid response for API Gateway
 * @param error - from the handler or services
 * @param exception - HTTP status code of the error
 * with default value of 500 as internal server error.
 * Can be customize and just open StatusCode enum
 * @returns object of APIGatewayProxyResult
 */
export function httpServerError(
    error: unknown,
    exception:
        | number
        | {
              statusCode: StatusCode.INTERNAL_SERVER_ERROR;
              stackTrace: unknown | undefined;
          } = StatusCode.INTERNAL_SERVER_ERROR,
): APIGatewayProxyResult {
    /**
     * Logs event to Cloudwatch for easy debugging
     */
    console.error({ error });

    if (typeof exception === 'object' && 'stackTrace' in (exception as object)) {
        console.error(exception['stackTrace']);
    }

    if (typeof error === 'string') {
        return {
            body: JSON.stringify({ message: error, status: exception }),
            statusCode: +exception,
            headers: { ...CORS_HEADERS },
        };
    }

    if (Array.isArray(error)) {
        return {
            body: JSON.stringify(error),
            statusCode: +exception,
            headers: { ...CORS_HEADERS },
        };
    }

    return {
        body: JSON.stringify({ message: 'Internal Server Error', status: exception }),
        statusCode: +exception,
        headers: { ...CORS_HEADERS },
    };
}
