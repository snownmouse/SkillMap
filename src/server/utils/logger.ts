type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  requestId?: string;
  userId?: string;
  treeId?: string;
  taskId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(entry: LogEntry): string {
  const base = `[${entry.level.toUpperCase()}] ${entry.timestamp}: ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    try {
      return `${base} ${JSON.stringify(entry.context)}`;
    } catch {
      return `${base} [context serialization error]`;
    }
  }
  return base;
}

function logToConsole(entry: LogEntry) {
  const formatted = formatLog(entry);
  switch (entry.level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      if (!isProduction) {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

let currentContext: LogContext = {};

export const logger = {
  setContext: (context: LogContext) => {
    currentContext = { ...currentContext, ...context };
  },

  clearContext: () => {
    currentContext = {};
  },

  getContext: () => ({ ...currentContext }),

  info: (message: string, context?: LogContext) => {
    logToConsole({ 
      level: 'info', 
      message, 
      timestamp: new Date().toISOString(), 
      context: { ...currentContext, ...context } 
    });
  },

  error: (message: string, context?: LogContext) => {
    logToConsole({ 
      level: 'error', 
      message, 
      timestamp: new Date().toISOString(), 
      context: { ...currentContext, ...context } 
    });
  },

  warn: (message: string, context?: LogContext) => {
    logToConsole({ 
      level: 'warn', 
      message, 
      timestamp: new Date().toISOString(), 
      context: { ...currentContext, ...context } 
    });
  },

  debug: (message: string, context?: LogContext) => {
    logToConsole({ 
      level: 'debug', 
      message, 
      timestamp: new Date().toISOString(), 
      context: { ...currentContext, ...context } 
    });
  },

  http: (method: string, path: string, statusCode: number, durationMs: number, context?: LogContext) => {
    logToConsole({
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      message: `${method} ${path} ${statusCode} ${durationMs}ms`,
      timestamp: new Date().toISOString(),
      context: { ...currentContext, method, path, statusCode, durationMs, ...context },
    });
  },
};

export function createRequestLogger(requestId: string, userId?: string) {
  return {
    info: (message: string, context?: LogContext) => logger.info(message, { ...context, requestId, userId }),
    error: (message: string, context?: LogContext) => logger.error(message, { ...context, requestId, userId }),
    warn: (message: string, context?: LogContext) => logger.warn(message, { ...context, requestId, userId }),
    debug: (message: string, context?: LogContext) => logger.debug(message, { ...context, requestId, userId }),
  };
}