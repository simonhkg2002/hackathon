import { defineConfig } from "vite";
import { buildingsMiddleware } from "./server/buildings.mjs";
import react from "@vitejs/plugin-react";
import { createLandsMiddleware } from "./server/lands.mjs";
export default defineConfig(() => {
  const api = createLandsMiddleware();
  return {
    plugins: [
      react(),
      {
        name: "lands-api",
        configureServer(server) {
          server.middlewares.use(buildingsMiddleware);
          server.middlewares.use(api);
        },
        configurePreviewServer(server) {
          server.middlewares.use(buildingsMiddleware);
          server.middlewares.use(api);
        },
      },
    ],
  };
});
