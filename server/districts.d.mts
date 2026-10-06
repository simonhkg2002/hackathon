import type { IncomingMessage, ServerResponse } from "node:http";
export function districtsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): Promise<void>;
