import type { CameraOptions } from "maplibre-gl";

function numberSetting(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = value?.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

export const mapConfig = {
  styleUrl:
    import.meta.env.VITE_MAP_STYLE_URL ||
    "https://tiles.openfreemap.org/styles/dark",
  buildingSource: import.meta.env.VITE_BUILDING_SOURCE || "openmaptiles",
  buildingSourceLayer: import.meta.env.VITE_BUILDING_SOURCE_LAYER || "building",
  heightProperty:
    import.meta.env.VITE_BUILDING_HEIGHT_PROPERTY || "render_height",
  baseProperty:
    import.meta.env.VITE_BUILDING_BASE_PROPERTY || "render_min_height",
};

export const initialCamera: CameraOptions = {
  center: [
    numberSetting(import.meta.env.VITE_MAP_LONGITUDE, 114.16, -180, 180),
    numberSetting(import.meta.env.VITE_MAP_LATITUDE, 22.35, -85, 85),
  ],
  zoom: numberSetting(import.meta.env.VITE_MAP_ZOOM, 10.5, 2, 20),
  pitch: numberSetting(import.meta.env.VITE_MAP_PITCH, 0, 0, 75),
  bearing: numberSetting(import.meta.env.VITE_MAP_BEARING, 0, -180, 180),
};
