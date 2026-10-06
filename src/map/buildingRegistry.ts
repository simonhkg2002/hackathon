import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map,
  MapMouseEvent,
} from "maplibre-gl";
import { setBasicBuildingsVisible } from "./buildings";
import type { Language } from "../i18n";
export type BuildingInfo = {
  noticeUpdated?: string;
  BuildingCSUID: string;
  BuildingNameTC?: string;
  BuildingNameEN?: string;
  BuildingBlockType: string;
  Storeys?: number;
  height: number;
  age: number | null;
  repair: number;
  repairResolved: number;
  inspectionResolved: number;
  noticeAddress?: string;
  inspection: number;
  records: string;
};
export type Highlight =
  "notices" | "all" | "repair" | "inspection" | "old" | "near" | "none";
const ids = ["registry-footprints", "registry-buildings", "registry-outline"];
const overviewIds = [
  "registry-overview-footprints",
  "registry-overview-outline",
];
export function highlightBuildings(map: Map, mode: Highlight) {
  const palette: ExpressionSpecification = [
    "match",
    ["get", "category"],
    "repair",
    "#f18277",
    "inspection",
    "#e8b961",
    "old",
    "#ba9ae8",
    "near",
    "#69c6dd",
    "#526a74",
  ];
  const matches: ExpressionSpecification =
    mode === "notices"
      ? ["any", [">", ["get", "repair"], 0], [">", ["get", "inspection"], 0]]
      : mode === "repair" || mode === "inspection"
        ? [">", ["get", mode], 0]
        : mode === "old"
          ? ["all", ["!=", ["get", "age"], null], [">=", ["get", "age"], 50]]
          : mode === "near"
            ? [
                "all",
                ["!=", ["get", "age"], null],
                [">=", ["get", "age"], 45],
                ["<", ["get", "age"], 50],
              ]
            : ["literal", mode === "all"];
  const colors = {
    notices: "#526a74",
    repair: "#f18277",
    inspection: "#e8b961",
    old: "#ba9ae8",
    near: "#69c6dd",
    none: "#526a74",
  };
  const color: ExpressionSpecification = [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    "#ffffff",
    matches,
    mode === "all" || mode === "notices" ? palette : colors[mode],
    "#526a74",
  ];
  for (const id of [ids[0], overviewIds[0]])
    if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", color);
  for (const id of [ids[1]])
    if (map.getLayer(id))
      map.setPaintProperty(id, "fill-extrusion-color", color);
  const overviewFilter: FilterSpecification =
    mode === "all"
      ? ["!=", ["get", "category"], "normal"]
      : mode === "none"
        ? ["literal", false]
        : (matches as FilterSpecification);
  for (const id of overviewIds)
    if (map.getLayer(id)) map.setFilter(id, overviewFilter);
}
export function mountBuildingRegistry(
  map: Map,
  status: (s: string) => void,
  select: (p: BuildingInfo | null) => void,
  districtName?: string,
  language: Language = "zh",
) {
  const say = (zh: string, en: string) => status(language === "en" ? en : zh);
  map.addSource("registry", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    maxzoom: 22,
    tolerance: 0,
    attribution: "樓宇資料 © 地政總署、屋宇署",
  });
  map.addLayer({
    id: ids[0],
    type: "fill",
    source: "registry",
    minzoom: 15,
    paint: { "fill-color": "#526a74", "fill-opacity": 1 },
  });
  map.addLayer({
    id: ids[1],
    type: "fill-extrusion",
    source: "registry",
    minzoom: 15,
    paint: {
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-color": "#526a74",
      "fill-extrusion-opacity": 1,
    },
  });
  map.addLayer({
    id: ids[2],
    type: "line",
    source: "registry",
    minzoom: 15,
    filter: ["==", ["get", "height"], 0],
    paint: { "line-color": "#9eb4ba", "line-width": 1 },
  });
  const relevant: FilterSpecification = ["!=", ["get", "category"], "normal"];
  map.addLayer({
    id: overviewIds[0],
    type: "fill",
    source: "registry",
    minzoom: 12,
    maxzoom: 15,
    filter: relevant,
    paint: { "fill-color": "#ba9ae8", "fill-opacity": 0.82 },
  });
  map.addLayer({
    id: overviewIds[1],
    type: "line",
    source: "registry",
    minzoom: 12,
    maxzoom: 15,
    filter: relevant,
    paint: { "line-color": "#d9eeed", "line-width": 0.65, "line-opacity": 0.6 },
  });
  for (const l of map.getStyle().layers)
    if (l.type === "symbol") map.moveLayer(l.id);
  highlightBuildings(map, districtName ? "repair" : "notices");
  let controller: AbortController | undefined;
  let disposed = false;
  let selected: number | string | undefined;
  let loadedBounds: number[] | undefined;
  let loadedProfile: "detail" | "overview" | undefined;
  let lastZoom = map.getZoom();
  const showOfficial = (visible: boolean) => {
    for (const id of ids)
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    setBasicBuildingsVisible(map, districtName ? false : !visible);
  };
  const update = async () => {
    const zoom = map.getZoom();
    const zoomedOut = zoom < lastZoom - 0.05;
    lastZoom = zoom;
    if (zoom < 13.25) {
      controller?.abort();
      showOfficial(false);
      say(
        "放大後可查看紅色樓宇輪廓。",
        "Zoom in to see red building footprints.",
      );
      return;
    }
    const profile = zoom < 15 ? "overview" : "detail";
    if (profile === "overview") showOfficial(false);
    const b = map.getBounds();
    const raw = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    // Zooming out keeps the already loaded colored subset. Fetching every newly
    // visible polygon at a wider zoom would defeat the lightweight overview.
    if (profile === "overview" && zoomedOut && !loadedBounds && controller) {
      say("正在載入紅色樓宇…", "Loading red buildings…");
      return;
    }
    if (profile === "overview" && loadedBounds && zoomedOut) {
      say("保留已載入區域的紅色樓宇。", "Keeping loaded red buildings.");
      return;
    }
    controller?.abort();
    if (
      loadedBounds &&
      (loadedProfile === profile ||
        (loadedProfile === "detail" && profile === "overview")) &&
      raw[0] >= loadedBounds[0] &&
      raw[1] >= loadedBounds[1] &&
      raw[2] <= loadedBounds[2] &&
      raw[3] <= loadedBounds[3]
    ) {
      showOfficial(profile === "detail");
      say(
        "此區紅色樓宇輪廓已載入。",
        "Red building shapes loaded for this district.",
      );
      return;
    }
    const box = [
      Math.max(113.8, raw[0] - 0.001),
      Math.max(22.1, raw[1] - 0.001),
      Math.min(114.5, raw[2] + 0.001),
      Math.min(22.6, raw[3] + 0.001),
    ];
    if (
      box[2] - box[0] >
        (districtName || profile === "overview" ? 0.18 : 0.09) ||
      box[3] - box[1] >
        (districtName || profile === "overview" ? 0.18 : 0.09) ||
      box[0] >= box[2] ||
      box[1] >= box[3]
    ) {
      showOfficial(false);
      say(
        "視野太廣；請放大查看樓宇。",
        "The view is too wide; zoom in to see buildings.",
      );
      return;
    }
    controller = new AbortController();
    const current = controller;
    say("正在載入視野內的紅色樓宇…", "Loading red buildings in this view…");
    try {
      const response = await fetch(
        "/api/buildings?bbox=" +
          box.map((n) => n.toFixed(6)).join(",") +
          (districtName
            ? `&only=repair&district=${encodeURIComponent(districtName)}`
            : profile === "overview"
              ? "&only=highlights"
              : ""),
        { signal: current.signal },
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (disposed || current.signal.aborted) return;
      (map.getSource("registry") as GeoJSONSource).setData(data);
      loadedBounds = box;
      loadedProfile = profile;
      showOfficial(profile === "detail");
      say(
        `此區紅色樓宇輪廓已載入 · 資料擷取 ${data.metadata.fetchedAt.slice(0, 10)}`,
        `Red building shapes loaded for this district · Data fetched ${data.metadata.fetchedAt.slice(0, 10)}`,
      );
    } catch {
      if (!disposed && !current.signal.aborted) {
        showOfficial(false);
        say(
          "樓宇資料載入失敗；移動地圖可重試。",
          "Building data could not load; move the map to retry.",
        );
      }
    }
  };
  const click = (e: MapMouseEvent) => {
    const f = map
      .queryRenderedFeatures(e.point, { layers: [...ids, ...overviewIds] })
      .find((f) => f.properties?.BuildingCSUID);
    if (selected !== undefined)
      map.setFeatureState(
        { source: "registry", id: selected },
        { selected: false },
      );
    selected = f?.id;
    if (selected !== undefined)
      map.setFeatureState(
        { source: "registry", id: selected },
        { selected: true },
      );
    select(f ? (f.properties as BuildingInfo) : null);
  };
  // Near the ground, a pitched camera can enter a tower and clip its walls.
  // Ease the allowed pitch down at close zoom; retain full rotation and panning.
  const cameraGuard = () => {
    const cap = Math.max(0, Math.min(75, (20 - map.getZoom()) * 30));
    if (Math.abs(map.getMaxPitch() - cap) > 0.1) map.setMaxPitch(cap);
  };
  map.on("zoom", cameraGuard);
  cameraGuard();
  map.on("moveend", update);
  map.on("click", click);
  void update();
  return () => {
    disposed = true;
    controller?.abort();
    map.off("zoom", cameraGuard);
    map.setMaxPitch(75);
    map.off("moveend", update);
    map.off("click", click);
    if (map.getSource("registry")) {
      for (const id of [...ids, ...overviewIds])
        if (map.getLayer(id)) map.removeLayer(id);
      map.removeSource("registry");
    }
    setBasicBuildingsVisible(map, true);
  };
}
