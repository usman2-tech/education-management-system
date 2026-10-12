/**
 * MODULE: Global HTTP Exception Filter
 *
 * PURPOSE:
 * Intercepts all unhandled exceptions across the application, normalizing them
 * into standardized, contract-compliant JSON response envelopes.
 *
 * SECURITY:
 * Prevents leaking raw internal stack traces or database error details to clients in production.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@ems/contracts';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error occurred';
    let errors: Record<string, string[]> | string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        if (Array.isArray(resObj.message)) {
          errors = resObj.message;
          message = 'Validation failed';
        } else if (resObj.errors) {
          errors = resObj.errors;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled runtime error: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
