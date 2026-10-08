import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEMO_BUILDING_CSUID = "1432326923T20050430";
export const TICKET_LOCATIONS = [
  "corridor",
  "lift",
  "stairs",
  "wet-area",
  "ceiling",
  "facade",
];
export const TICKET_CATEGORIES = [
  "ceiling",
  "water",
  "electrical",
  "concrete",
  "door",
  "obstruction",
  "fire-safety",
  "lift",
  "facade",
  "other",
];

const json = (res, status, value) => {
  res
    .writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    .end(JSON.stringify(value));
};

const readBody = async (req) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request too large");
  }
  return JSON.parse(body);
};

export function createDemoTicketsMiddleware({
  filePath = resolve(
    process.env.DEMO_TICKETS_FILE || ".local/demo-tickets.json",
  ),
} = {}) {
  let loaded;
  let mutation = Promise.resolve();
  const listeners = new Set();
  const recentPosts = new Map();
  const getTickets = async () => {
    if (!loaded) {
      loaded = readFile(filePath, "utf8")
        .then((data) => JSON.parse(data))
        .catch((error) => {
          if (error.code === "ENOENT") return [];
          throw error;
        });
    }
    return loaded;
  };
  const broadcast = (tickets) => {
    const payload = `event: tickets\ndata: ${JSON.stringify({ buildingCsuid: DEMO_BUILDING_CSUID, tickets })}\n\n`;
    for (const response of listeners) response.write(payload);
  };

  return async (req, res, next) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (
      pathname !== "/api/demo-tickets" &&
      pathname !== "/api/demo-tickets/events"
    )
      return next();
    try {
      if (pathname.endsWith("/events")) {
        if (req.method !== "GET")
          return json(res, 405, { error: "Method not allowed" });
        await getTickets();
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.write(": connected\n\n");
        listeners.add(res);
        const heartbeat = setInterval(
          () => res.write(": heartbeat\n\n"),
          25_000,
        );
        res.on("close", () => {
          clearInterval(heartbeat);
          listeners.delete(res);
        });
        return;
      }
      if (req.method === "GET") {
        const tickets = await getTickets();
        return json(res, 200, { buildingCsuid: DEMO_BUILDING_CSUID, tickets });
      }
      if (req.method !== "POST")
        return json(res, 405, { error: "Method not allowed" });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host)
        return json(res, 403, { error: "Same-origin requests only" });
      if (
        !String(req.headers["content-type"] || "").startsWith(
          "application/json",
        )
      )
        return json(res, 415, { error: "JSON required" });
      let input;
      try {
        input = await readBody(req);
      } catch {
        return json(res, 400, { error: "Invalid JSON or request too large" });
      }
      const floor = Number(input?.floor);
      const description = String(input?.description || "").trim();
      const point = input?.modelPoint;
      const validPoint =
        point == null ||
        (typeof point === "object" &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.z) &&
          point.x >= -12 &&
          point.x <= 12 &&
          point.z >= -10 &&
          point.z <= 10);
      if (
        input?.buildingCsuid !== DEMO_BUILDING_CSUID ||
        !Number.isInteger(floor) ||
        floor < 1 ||
        floor > 44 ||
        !TICKET_LOCATIONS.includes(input?.location) ||
        !TICKET_CATEGORIES.includes(input?.category) ||
        !validPoint ||
        description.length < 10 ||
        description.length > 500
      )
        return json(res, 400, { error: "Invalid ticket fields" });
      const address = req.socket?.remoteAddress || "unknown";
      const now = Date.now();
      const recent = (recentPosts.get(address) || []).filter(
        (time) => now - time < 60_000,
      );
      if (recent.length >= 5)
        return json(res, 429, { error: "Demo rate limit reached" });
      const ticket = {
        id: randomUUID(),
        buildingCsuid: DEMO_BUILDING_CSUID,
        floor,
        location: input.location,
        category: input.category,
        description,
        modelPoint:
          point == null
            ? null
            : {
                x: Math.round(point.x * 10) / 10,
                z: Math.round(point.z * 10) / 10,
              },
        status: "new",
        createdAt: new Date().toISOString(),
      };
      mutation = mutation
        .catch(() => {})
        .then(async () => {
          const tickets = await getTickets();
          const nextTickets = [ticket, ...tickets];
          await mkdir(dirname(filePath), { recursive: true });
          const temp = `${filePath}.${randomUUID()}.tmp`;
          await writeFile(temp, JSON.stringify(nextTickets), { mode: 0o600 });
          await rename(temp, filePath);
          loaded = Promise.resolve(nextTickets);
          broadcast(nextTickets);
        });
      await mutation;
      recentPosts.set(address, [...recent, now]);
      return json(res, 201, ticket);
    } catch {
      if (!res.headersSent) json(res, 503, { error: "Tickets unavailable" });
      else res.destroy();
    }
  };
}
