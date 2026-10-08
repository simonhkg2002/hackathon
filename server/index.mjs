import { buildingsMiddleware } from "./buildings.mjs";
import { districtsMiddleware } from "./districts.mjs";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { createGzip } from "node:zlib";
import { stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createLandsMiddleware } from "./lands.mjs";
import { createDemoTicketsMiddleware } from "./demo-tickets.mjs";

const root = resolve("dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const api = createLandsMiddleware();
const tickets = createDemoTicketsMiddleware();
createServer((req, res) => {
  void buildingsMiddleware(req, res, () => {
    void districtsMiddleware(req, res, () => {
      void tickets(req, res, () => {
        void api(req, res, () => {
          void (async () => {
            try {
              const pathname = decodeURIComponent(
                new URL(req.url || "/", "http://localhost").pathname,
              );
              let file = resolve(root, "." + pathname);
              if (file !== root && !file.startsWith(root + "/")) {
                res.writeHead(403).end();
                return;
              }
              try {
                if (!(await stat(file)).isFile())
                  file = resolve(root, "index.html");
              } catch {
                file = resolve(root, "index.html");
              }
              await stat(file);
              const compress =
                extname(file) === ".json" &&
                /\bgzip\b/.test(req.headers["accept-encoding"] || "");
              res.writeHead(200, {
                "Content-Type":
                  mime[extname(file)] || "application/octet-stream",
                ...(extname(file) === ".json"
                  ? { Vary: "Accept-Encoding" }
                  : {}),
                ...(pathname.startsWith("/repair-geometries/")
                  ? { "Cache-Control": "public, max-age=300" }
                  : {}),
                ...(compress ? { "Content-Encoding": "gzip" } : {}),
              });
              const stream = createReadStream(file);
              stream.on("error", () => res.destroy());
              if (compress) stream.pipe(createGzip()).pipe(res);
              else stream.pipe(res);
            } catch {
              res
                .writeHead(500)
                .end("Build the application with npm run build first.");
            }
          })();
        });
      });
    });
  });
}).listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || "127.0.0.1",
  () => console.log("HK map server ready"),
);
