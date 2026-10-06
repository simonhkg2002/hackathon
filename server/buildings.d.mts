import type { IncomingMessage, ServerResponse } from "node:http";
export function buildingsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): Promise<void>;
