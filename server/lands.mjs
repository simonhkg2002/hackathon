import { Readable } from "node:stream";

export function createLandsMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/lands/")) return next();
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    let upstream;
    if (url.pathname === "/api/lands/identify") {
      const x = Number(url.searchParams.get("x"));
      const y = Number(url.searchParams.get("y"));
      const lang = url.searchParams.get("lang") || "zh";
      if (
        !url.searchParams.has("x") ||
        !url.searchParams.has("y") ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 780000 ||
        x > 880000 ||
        y < 790000 ||
        y > 860000 ||
        !["zh", "en"].includes(lang)
      ) {
        res.writeHead(400).end("Invalid HK80 coordinates");
        return;
      }
      upstream = new URL("https://www.map.gov.hk/gs/api/v1.0.0/identify");
      upstream.search = new URLSearchParams({
        x: String(x),
        y: String(y),
        lang,
      }).toString();
    } else {
      res.writeHead(404).end();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const abort = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", abort);
    try {
      const response = await fetch(upstream, { signal: controller.signal });
      if (!response.ok) {
        res
          .writeHead(response.status, {
            "Content-Type": "text/plain; charset=utf-8",
          })
          .end(`Lands Department service returned ${response.status}`);
        return;
      }
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      });
      if (response.body) {
        const body = Readable.fromWeb(response.body);
        body.on("error", () => res.destroy());
        body.pipe(res);
        await new Promise((resolve) => {
          res.once("finish", resolve);
          res.once("close", resolve);
        });
      } else res.end();
    } catch {
      if (!res.headersSent)
        res
          .writeHead(502, { "Content-Type": "text/plain; charset=utf-8" })
          .end("Lands Department service unavailable or timed out");
      else res.destroy();
    } finally {
      clearTimeout(timer);
      res.off("close", abort);
    }
  };
}
