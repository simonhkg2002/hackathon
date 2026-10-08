import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDemoTicketsMiddleware,
  DEMO_BUILDING_CSUID,
} from "../server/demo-tickets.mjs";

test("demo tickets validate floor and location, persist, and stream new reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hk-demo-tickets-"));
  const filePath = join(dir, "tickets.json");
  const middleware = createDemoTicketsMiddleware({ filePath });
  const server = createServer(
    (req, res) => void middleware(req, res, () => res.writeHead(404).end()),
  );
  const streamAbort = new AbortController();
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const initial = await (await fetch(`${base}/api/demo-tickets`)).json();
    assert.deepEqual(initial.tickets, []);

    const invalid = await fetch(`${base}/api/demo-tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingCsuid: DEMO_BUILDING_CSUID,
        floor: 45,
        location: "lift",
        category: "ceiling",
        description: "Loose ceiling plaster",
      }),
    });
    assert.equal(invalid.status, 400);

    const privateUnit = await fetch(`${base}/api/demo-tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingCsuid: DEMO_BUILDING_CSUID,
        floor: 12,
        location: "unit",
        category: "water",
        description: "Leak inside a private flat",
      }),
    });
    assert.equal(privateUnit.status, 400);

    const invalidPoint = await fetch(`${base}/api/demo-tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingCsuid: DEMO_BUILDING_CSUID,
        floor: 12,
        location: "lift",
        category: "ceiling",
        description: "Loose ceiling plaster",
        modelPoint: { x: 99, z: 0 },
      }),
    });
    assert.equal(invalidPoint.status, 400);

    const stream = await fetch(`${base}/api/demo-tickets/events`, {
      signal: streamAbort.signal,
    });
    assert.equal(stream.status, 200);
    const reader = stream.body.getReader();
    await reader.read(); // SSE connection comment.

    const created = await fetch(`${base}/api/demo-tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingCsuid: DEMO_BUILDING_CSUID,
        floor: 12,
        location: "corridor",
        category: "obstruction",
        description: "Boxes block the shared corridor near the lift",
        modelPoint: { x: -1.1, z: -0.9 },
      }),
    });
    assert.equal(created.status, 201);
    const ticket = await created.json();
    assert.equal(ticket.floor, 12);
    assert.equal(ticket.status, "new");
    assert.deepEqual(ticket.modelPoint, { x: -1.1, z: -0.9 });
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /event: tickets/);
    assert.match(update, new RegExp(ticket.id));

    const saved = JSON.parse(await readFile(filePath, "utf8"));
    assert.equal(saved[0].id, ticket.id);
    const reloaded = createDemoTicketsMiddleware({ filePath });
    const response = {
      writeHead(status) {
        this.status = status;
        return this;
      },
      end(body) {
        this.body = body;
      },
    };
    await reloaded(
      { url: "/api/demo-tickets", method: "GET" },
      response,
      () => {},
    );
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).tickets[0].id, ticket.id);
  } finally {
    streamAbort.abort();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
