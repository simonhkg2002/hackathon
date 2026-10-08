import type { IncomingMessage, ServerResponse } from "node:http";
export function createDemoTicketsMiddleware(options?: {
  filePath?: string;
}): (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => Promise<void>;
