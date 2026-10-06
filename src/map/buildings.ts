import type { ExpressionSpecification, Map } from "maplibre-gl";
import { mapConfig } from "./config";

export const buildingLayerIds = [
  "hk-building-footprints",
  "hk-buildings-skyline",
  "hk-buildings-neighbourhood",
  "hk-buildings-detail",
];

export function setBasicBuildingsVisible(map: Map, visible: boolean) {
  for (const id of buildingLayerIds) {
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

export function addBuildings(map: Map): boolean {
  if (!map.getSource(mapConfig.buildingSource)) return false;
  if (map.getLayer(buildingLayerIds[0])) return true;

  const height: ExpressionSpecification = [
    "max",
    0,
    ["to-number", ["get", mapConfig.heightProperty], 0],
  ];
  const base: ExpressionSpecification = [
    "min",
    height,
    ["max", 0, ["to-number", ["get", mapConfig.baseProperty], 0]],
  ];
  const originalLayers = map.getStyle().layers;
  // Replace the style's almost-black footprints rather than double-drawing them.
  for (const layer of originalLayers) {
    if (
      "source" in layer &&
      "source-layer" in layer &&
      layer.source === mapConfig.buildingSource &&
      layer["source-layer"] === mapConfig.buildingSourceLayer
    ) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
  const firstRoad = originalLayers.find(
    (layer) =>
      "source-layer" in layer &&
      (layer["source-layer"] === "transportation" ||
        layer["source-layer"] === "aeroway"),
  );
  map.addLayer(
    {
      id: buildingLayerIds[0],
      type: "fill",
      source: mapConfig.buildingSource,
      "source-layer": mapConfig.buildingSourceLayer,
      minzoom: 12,
      paint: {
        "fill-color": "#32434a",
        "fill-outline-color": "#53636a",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          0.2,
          14,
          0.65,
          17,
          0.8,
        ],
      },
    },
    firstRoad?.id,
  );

  // Three disjoint zoom bands, one vector source. Never download heavy models here.
  const bands = [
    {
      id: buildingLayerIds[1],
      minzoom: 13.5,
      maxzoom: 15.5,
      minimumHeight: 60,
    },
    {
      id: buildingLayerIds[2],
      minzoom: 15.5,
      maxzoom: 16.5,
      minimumHeight: 20,
    },
    { id: buildingLayerIds[3], minzoom: 16.5, maxzoom: 24, minimumHeight: 0 },
  ];
  for (const band of bands) {
    map.addLayer({
      id: band.id,
      source: mapConfig.buildingSource,
      "source-layer": mapConfig.buildingSourceLayer,
      type: "fill-extrusion",
      minzoom: band.minzoom,
      maxzoom: band.maxzoom,
      filter: [
        "all",
        [">", height, 0],
        [">=", height, band.minimumHeight],
        ["!=", ["to-string", ["get", "hide_3d"]], "true"],
      ],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          height,
          0,
          "#455b63",
          100,
          "#607981",
          350,
          "#8ba6aa",
        ],
        "fill-extrusion-height": height,
        "fill-extrusion-base": base,
        "fill-extrusion-opacity": 1,
        "fill-extrusion-vertical-gradient": true,
      },
    });
  }
  // Roads first, opaque buildings next, labels last. The first symbol in this
  // style is a WATER label, not the start of a final label-only block.
  for (const layer of originalLayers) {
    if (layer.type === "symbol") map.moveLayer(layer.id);
  }
  map.setLight({
    anchor: "viewport",
    color: "#d6eceb",
    intensity: 0.45,
    position: [1.5, 210, 45],
  });
  return true;
}
