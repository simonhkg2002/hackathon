import { setBasicBuildingsVisible } from "./buildings";
import { ArchitecturalScenegraphLayer } from "./ArchitecturalScenegraphLayer";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { Tiles3DLoader } from "@loaders.gl/3d-tiles";
import { bridgeDeckCamera } from "./deckCompatibility";
import { enableTerrain, disableTerrain } from "./terrain";
import { simplifyModelMaterials } from "./modelMaterials";
import type { Map } from "maplibre-gl";

export type ModelMode = "basic" | "spatial";
export function mountOfficialModels(
  map: Map,
  mode: ModelMode,
  onStatus: (message: string) => void,
) {
  let disposed = false;
  let hasContent = false;
  let failed = false;
  const tilesets: { isLoaded(): boolean }[] = [];
  let cycleStart = performance.now();
  let settledSince = 0;
  let reported = false;
  const paths = ["3dsd/WGS84/building", "3dsd/WGS84/infrastructure"];
  const setBasic = (visible: boolean) => setBasicBuildingsVisible(map, visible);
  if (mode === "basic") {
    disableTerrain(map);
    setBasic(true);
    onStatus("依縮放顯示建築 · 遠看輪廓，近看立體");
    return () => {};
  }
  onStatus("正在載入地政總署 3D 模型…");
  setBasic(false);
  enableTerrain(map);
  const timer = window.setTimeout(() => {
    if (!disposed && !hasContent)
      onStatus("模型仍在載入，請靠近陸地放大；亦可切回基本建築。");
  }, 30000);
  const error = () => {
    if (!disposed) {
      failed = true;
      onStatus(
        "部分模型無法載入，請重試或切回基本建築；檢查伺服器 key 及連線。",
      );
    }
    return true;
  };
  const moved = () => {
    cycleStart = performance.now();
    settledSince = 0;
    reported = false;
  };
  map.on("moveend", moved);
  const progress = window.setInterval(() => {
    if (disposed || failed || !hasContent) return;
    const complete =
      tilesets.length === paths.length &&
      tilesets.every((tileset) => tileset.isLoaded());
    if (!complete || map.isMoving()) {
      settledSince = 0;
      onStatus("模型已顯示 · 正在補齊目前視野的細節…");
    } else {
      settledSince ||= performance.now();
      if (performance.now() - settledSince < 1000) return;
      onStatus("目前視野模型已載入 · 山體以原比例顯示");
      if (!reported && import.meta.env.DEV) {
        console.debug(
          `Spatial view settled in ${((performance.now() - cycleStart) / 1000).toFixed(1)}s`,
        );
      }
      reported = true;
    }
  }, 500);
  const removeCameraBridge = bridgeDeckCamera(map);
  const overlay = new MapboxOverlay({
    interleaved: true,
    useDevicePixels: Math.min(window.devicePixelRatio, 2),
    onError: error,
    layers: paths.map(
      (path) =>
        new Tile3DLayer({
          id: `lands-${path}`,
          data: `/api/lands/3d/${path}/tileset.json`,
          loaders: [Tiles3DLoader],
          loadOptions: {
            gltf: { loadImages: false },
            "3d-tiles": { loadGLTF: true },
            tileset: {
              maximumScreenSpaceError: 4,
              maximumMemoryUsage: 256,
              memoryAdjustedScreenSpaceError: true,
              maxRequests: 8,
              debounceTime: 80,
              throttleRequests: true,
            },
          },
          pickable: false,
          onTilesetLoad: (tileset) => {
            tilesets.push(tileset);
          },
          _subLayerProps: {
            scenegraph: {
              type: ArchitecturalScenegraphLayer,
              _lighting: "flat",
            },
          },

          onTileLoad: (tile) => {
            if (!tile.content?.gltf && !tile.content?.positions) return;
            if (tile.content.gltf) simplifyModelMaterials(tile.content.gltf);
            if (!disposed && !hasContent) {
              hasContent = true;
              clearTimeout(timer);
              if (!failed) onStatus("模型已顯示 · 正在補齊目前視野的細節…");
            }
          },
          onTileError: error,
          onError: error,
        }),
    ),
  });
  map.addControl(overlay);
  return () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(progress);
    map.off("moveend", moved);
    if (map.hasControl(overlay)) map.removeControl(overlay);
    removeCameraBridge();
    disableTerrain(map);
    setBasic(true);
  };
}
