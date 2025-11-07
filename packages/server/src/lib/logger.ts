type LogLevel = "info" | "warn" | "error" | "debug";

const formatMessage = (level: LogLevel, message: string, payload?: Record<string, unknown>) => {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (!payload || Object.keys(payload).length === 0) {
    return base;
  }
  return `${base} ${JSON.stringify(payload)}`;
};

const log = (level: LogLevel, message: string, payload?: Record<string, unknown>) => {
  const formatted = formatMessage(level, message, payload);
  switch (level) {
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(formatted);
      }
      break;
  }
};

export const logger = {
  info: (message: string, payload?: Record<string, unknown>) => log("info", message, payload),
  warn: (message: string, payload?: Record<string, unknown>) => log("warn", message, payload),
  error: (message: string, payload?: Record<string, unknown>) => log("error", message, payload),
  debug: (message: string, payload?: Record<string, unknown>) => log("debug", message, payload),
};
