import { pino } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || "info";

const getLoggerOptions = () => {
    if (isProduction) {
        return { level };
    }
    return {
        level,
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "yyyy-mm-dd HH:MM:ss Z",
                ignore: "pid,hostname",
                colorize: true,
            },
        },
    };
};

export const logger = pino(getLoggerOptions());
