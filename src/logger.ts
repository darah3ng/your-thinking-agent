import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import pino, { type Logger } from "pino";
import pretty from "pino-pretty";

export type RunLogger = Logger & { filePath: string };

export function createRunLogger(): RunLogger {
  const logsDirectory = resolve(process.cwd(), "logs");
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = resolve(logsDirectory, `${runTimestamp}.log`);

  mkdirSync(logsDirectory, { recursive: true });

  const output = pretty({
    colorize: false,
    destination: filePath,
    ignore: "pid,hostname",
    mkdir: true,
    sync: true,
    translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
  });
  const logger = pino(
    { level: process.env.LOG_LEVEL?.toLowerCase() === "debug" ? "debug" : "info" },
    output,
  ) as RunLogger;

  logger.filePath = filePath;
  return logger;
}
