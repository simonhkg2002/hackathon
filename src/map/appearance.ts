import type { Map } from "maplibre-gl";

export function applyDarkAppearance(map: Map) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", "#141d23");
    } else if (layer.type === "fill" && layer["source-layer"] === "water") {
      map.setPaintProperty(layer.id, "fill-color", "#0b1921");
    } else if (
      layer.type === "line" &&
      layer["source-layer"] === "transportation"
    ) {
      map.setPaintProperty(
        layer.id,
        "line-color",
        layer.id.includes("casing")
          ? "#172229"
          : layer.id.includes("motorway") || layer.id.includes("major")
            ? "#46565f"
            : "#2e3d45",
      );
    } else if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#a8b6bf");
      map.setPaintProperty(layer.id, "text-halo-color", "#141d23");
      map.setPaintProperty(layer.id, "text-halo-width", 1);
    }
    // Keep the overview quiet; local street detail appears only when useful.
    if (layer.type === "symbol") {
      if (layer["source-layer"] === "transportation") {
        map.setLayerZoomRange(
          layer.id,
          Math.max(layer.minzoom || 0, 17),
          layer.maxzoom || 24,
        );
      } else if (layer["source-layer"] === "transportation_name") {
        map.setLayerZoomRange(
          layer.id,
          Math.max(layer.minzoom || 0, layer.id.includes("motorway") ? 14 : 16),
          layer.maxzoom || 24,
        );
      } else if (layer["source-layer"] === "water_name") {
        map.setLayerZoomRange(
          layer.id,
          Math.max(layer.minzoom || 0, 15.5),
          layer.maxzoom || 24,
        );
      }
    }
    // This public style references an unavailable wood sprite; solid land fill remains.
    if (
      layer.type === "fill" &&
      layer.paint?.["fill-pattern"] === "wood-pattern"
    ) {
      map.setPaintProperty(layer.id, "fill-pattern", undefined);
    }
  }
}
