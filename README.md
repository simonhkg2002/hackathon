# Hong Kong 3D Map

A minimal full-window React + TypeScript map, built with Vite, MapLibre GL JS and Tailwind CSS. The default camera shows a district-level overview of Hong Kong. OpenFreeMap's dark vector style supplies land, coastline, water, roads and labels from OpenStreetMap-compatible data.

## Run locally

Use Node.js 24 LTS (the tests use built-in TypeScript support).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The OpenStreetMap buildings, official building records and Identify work without a key. Internet access is required for public vector tiles, styles, fonts and sprites; this is not an offline map. WebGL must be enabled.

```sh
npm run build    # TypeScript check and production build
npm run preview  # Serve the production build locally
npm run lint
npm run format
```

For the complete app, run `npm run build` then `npm start`. The Node server serves `dist/` and the same-origin district, building and Identify endpoints on `127.0.0.1:4173` (override `HOST` and `PORT` for your deployment). A static-only host cannot provide these endpoints without an equivalent backend. `VITE_*` settings are embedded at build time. Restart after changing them.

## Controls

- Drag to pan; scroll/pinch or use + / − to zoom.
- Right-drag or Ctrl-drag to rotate and tilt. On touch screens, use two fingers to rotate or tilt.
- The compass indicates north; click it to restore north-up and drag it to rotate.
- The reset button returns to the 18-district overview. Click a district badge or choose one from the complete list to inspect its repair-order buildings.
- Use 繁中 / EN to switch interface and Identify result language; the choice persists in this browser.
- Focus the map canvas: arrow keys pan, + / − zoom, Shift + left/right rotate, and Shift + up/down change pitch.

## Configuration

Copy `.env.example` to `.env.local` if you want to change the map style, camera, or building schema. Invalid numeric settings fall back to the defaults. Restart Vite after editing environment files.

The default style is `https://tiles.openfreemap.org/styles/dark`; no token is needed. A replacement must be a MapLibre-compatible vector style with a building source. Set `VITE_BUILDING_SOURCE`, `VITE_BUILDING_SOURCE_LAYER`, and the height/base property names to match it. Heights must be numeric meters. If a provider requires a token, put its **public browser token**, restricted to your deployment domains, in `VITE_MAP_STYLE_URL` according to its documentation. Every `VITE_*` setting is visible to visitors: never put private credentials there.

## Building heights

The extrusion layer uses the provider's `render_height` and `render_min_height` values directly, without exaggeration or generated skyscrapers. Missing or nonnumeric heights resolve to zero, leaving those footprints flat. OpenMapTiles can derive render heights from OSM levels or provider defaults when surveyed heights are unavailable, so these values are source-based, not a guarantee of surveyed accuracy. Coverage varies by location and zoom. Buildings are shown by zoom tier, above roads and below labels. The lightweight map uses a flat ground plane.

## Structure

```text
src/
  App.tsx                     App entry
  main.tsx                    React root and CSS imports
  styles.css                  Tailwind and basic MapLibre control styling
  components/DistrictMap.tsx  District navigation, language switch and map lifecycle
  map/config.ts               Environment settings and initial camera
  map/buildings.ts            Source-based 3D extrusion layer
  map/appearance.ts           Dark map colors and label contrast
```

MapLibre owns rendering and interaction; React does not re-render on camera movements. Cleanup removes the map and resize observer, including during development Strict Mode remounts.

## Data and references

Keep the map's built-in attribution visible. Map data and tile service terms apply:

- [OpenFreeMap](https://openfreemap.org/)
- [OpenStreetMap copyright and contributors](https://www.openstreetmap.org/copyright)
- [OpenMapTiles building schema](https://openmaptiles.org/schema/#building)
- [MapLibre 3D buildings example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/)

## Identify

開啟 Identify 後點選地圖，程式將 WGS84 轉為 HK80，透過同源代理查詢地政總署的建築、地址與設施資料。點選屋頂時查詢的是地圖點位，不保證對應該建築。`server/lands.mjs` 僅轉發香港範圍內的 Identify 座標；無需 API key。正式部署仍應依流量需要設定限流。服務 URL：`https://www.map.gov.hk/gs/api/v1.0.0/identify?x={HK80_X}&y={HK80_Y}&lang={zh|en}`。

完整擴充資料來源清單見 [香港地圖 API 清單](docs/HONG_KONG_APIS.zh-Hant.md)。

## 地區總覽與樓宇顯示

預設以 18 區標記呈現自 2023 年 5 月起曾獲發第 26 條修葺令的**樓座數**，而非命令份數或正在維修數。密集地區的標記會避讓，完整 18 區可從清單選擇。按區後鏡頭放大，瀏覽器一次載入該區預先整理的官方樓宇輪廓；縮放 15 以上以來源高度顯示立體樓宇。灰色 OSM 建築在區域模式隱藏，以突出紅色樓宇。地圖仍可平移探索該區其他街道，無需重新查詢樓宇幾何。

前端只接收小量地區摘要；按區後會下載預先整理的該區官方樓宇輪廓，避免每次移圖都等待政府即時幾何查詢。樓座與 CSUID 配對資料仍由政府公開資料建立。`npm run data:refresh` 同時更新統計和 `public/repair-geometries/` 快取；若只需重建輪廓，可執行 `npm run data:geometry-cache`。地區數字按屋宇署 `BLOCK_ID_EN` 去重，不把一棟樓的多個 3D 輪廓計成多棟。統計只涵蓋公開資料的時段，沒有現時施工或棚網狀態。

## 樓宇資料

點選紅色樓宇可查看名稱、樓齡（入伙紙日期）、高度、層數、用途，以及曾發出和已遵從／撤銷／被取代的驗樓／修葺令紀錄。樓齡不代表樓宇不安全。完整資料來源及限制見 [樓宇資料說明](docs/BUILDING_DATA.zh-Hant.md)。

屯門區「新屯門中心第１座」（官方 CSUID `1432326923T20050430`）是第二層功能的唯一示範樓宇。第一層左側有「前往圖則示範」捷徑，該座地圖輪廓上方也有標籤。點選它會出現示範存取碼 `000000`；按「繼續」直接進入第二層公開平面圖畫面。這不是身份驗證，任何人都能進入，亦不會要求或傳送住客資料。其他樓宇保持原有互動。

[新屯門中心第１座圖則資料](docs/public-floor-plan-example.md)列出可核對的公開參考平面圖及限制。第二層直接顯示該圖並連到來源頁面；這不是屋宇署核准圖則，亦不代表目前的室內狀況。

第二層亦有可旋轉、縮放的 3D 樓層剖面示意，可切換半透明天花並點選「天花剝落」模擬標記。模型的牆線與尺寸未經核准圖則測量，紅色標記不是實際維修紀錄；詳見[圖則資料與 3D 精度說明](docs/public-floor-plan-example.md)。

更新資料：`npm run data:refresh`（Python 3），完成後重新整理地圖。正式部署須帶同 `data/` 目錄。
