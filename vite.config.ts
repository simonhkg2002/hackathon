import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import { buildingsMiddleware } from "./server/buildings.mjs";
import { districtsMiddleware } from "./server/districts.mjs";
import react from "@vitejs/plugin-react";
import { createLandsMiddleware } from "./server/lands.mjs";
import { createDemoTicketsMiddleware } from "./server/demo-tickets.mjs";
export default defineConfig(({ mode }) => {
  const api = createLandsMiddleware();
  const env = loadEnv(mode, process.cwd(), "");
  const tickets = createDemoTicketsMiddleware({
    filePath: resolve(env.DEMO_TICKETS_FILE || ".local/demo-tickets.json"),
  });
  return {
    plugins: [
      react(),
      {
        name: "lands-api",
        configureServer(server) {
          server.middlewares.use(buildingsMiddleware);
          server.middlewares.use(districtsMiddleware);
          server.middlewares.use(tickets);
          server.middlewares.use(api);
        },
        configurePreviewServer(server) {
          server.middlewares.use(buildingsMiddleware);
          server.middlewares.use(districtsMiddleware);
          server.middlewares.use(tickets);
          server.middlewares.use(api);
        },
      },
    ],
  };
});
