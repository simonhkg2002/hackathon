import { readFile } from "node:fs/promises";

const statsPath = new URL(
  "../data/district-repair-stats.json",
  import.meta.url,
);

export async function districtsMiddleware(req, res, next) {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname !== "/api/districts") return next();
  if (req.method !== "GET") {
    res.writeHead(405).end();
    return;
  }
  try {
    const data = JSON.parse(await readFile(statsPath, "utf8"));
    const summary = {
      ...data,
      districts: data.districts.map((district) => ({
        name: district.name,
        nameEn: district.nameEn,
        orders: district.orders,
        buildings: district.buildings,
        center: district.center,
        bbox: district.bbox,
      })),
    };
    res
      .writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      })
      .end(JSON.stringify(summary));
  } catch {
    res.writeHead(503).end("District data is unavailable");
  }
}
