/**
 * MODULE: Structured Application Logger
 *
 * PURPOSE:
 * Implements a structured, high-visibility logging interface for audit trails,
 * application diagnostics, and request tracking.
 */

import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private contextName = 'EMS-API';

  setContext(context: string) {
    this.contextName = context;
  }

  log(message: any, context?: string) {
    this.printLog('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printLog('ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printLog('WARN', message, context);
  }

  debug(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.printLog('DEBUG', message, context);
    }
  }

  verbose(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.printLog('VERBOSE', message, context);
    }
  }

  private printLog(level: string, message: any, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    const activeContext = context || this.contextName;

    if (process.env.NODE_ENV === 'production') {
      const payload: Record<string, any> = {
        timestamp,
        level,
        context: activeContext,
        message,
      };
      if (trace) payload.trace = trace;
      console.log(JSON.stringify(payload));
    } else {
      const color =
        level === 'ERROR'
          ? '\x1b[31m'
          : level === 'WARN'
          ? '\x1b[33m'
          : level === 'DEBUG'
          ? '\x1b[35m'
          : '\x1b[32m';
      const reset = '\x1b[0m';
      console.log(
        `${color}[${level}]${reset} [${timestamp}] \x1b[36m[${activeContext}]\x1b[0m ${
          typeof message === 'object' ? JSON.stringify(message, null, 2) : message
        }`,
      );
      if (trace) {
        console.error(`\x1b[31m${trace}\x1b[0m`);
      }
    }
  }
}
