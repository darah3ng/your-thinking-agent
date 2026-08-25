import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface RunLogger {
  filePath: string;
  log(name: string, data?: unknown): void;
}

function formatData(data: unknown): string {
  if (data === undefined) {
    return "";
  }

  const serialized = JSON.stringify(
    data,
    (_key, value: unknown) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }

      return typeof value === "bigint" ? value.toString() : value;
    },
    2,
  );

  return serialized ?? String(data);
}

export function createRunLogger(): RunLogger {
  const logsDirectory = resolve(process.cwd(), "logs");
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = resolve(logsDirectory, `${runTimestamp}.log`);

  mkdirSync(logsDirectory, { recursive: true });

  return {
    filePath,
    log(name, data) {
      const timestamp = new Date().toISOString();
      const formattedData = formatData(data);
      const entry = formattedData
        ? `[${timestamp}] ${name}\n${formattedData}\n\n`
        : `[${timestamp}] ${name}\n\n`;

      appendFileSync(filePath, entry, "utf8");
    },
  };
}
