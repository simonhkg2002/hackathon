import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createLandsMiddleware } from "../server/lands.mjs";

test("proxy rejects invalid coordinates, removed model paths, and writes", async () => {
  const middleware = createLandsMiddleware();
  const server = createServer(
    (req, res) => void middleware(req, res, () => res.writeHead(404).end()),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, status, method] of [
      ["/api/lands/identify", 400, "GET"],
      ["/api/lands/identify?x=NaN&y=817198", 400, "GET"],
      ["/api/lands/identify?x=0&y=817198", 400, "GET"],
      ["/api/lands/3d/3dsd/WGS84/building/tileset.json", 404, "GET"],
      ["/api/lands/identify?x=835665&y=817198", 405, "POST"],
    ]) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, status, path);
      await response.text();
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
