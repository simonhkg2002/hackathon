# Hong Kong 3D Map

A minimal full-window React + TypeScript map, built with Vite, MapLibre GL JS and Tailwind CSS. The default camera looks across Victoria Harbour at a 45° pitch. OpenFreeMap's dark vector style supplies land, coastline, water, roads and labels from OpenStreetMap-compatible data.

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

For the complete app, run `npm run build` then `npm start`. The Node server serves `dist/` and the same-origin building and Identify endpoints on `127.0.0.1:4173` (override `HOST` and `PORT` for your deployment). A static-only host cannot provide these endpoints without an equivalent backend. `VITE_*` settings are embedded at build time. Restart after changing them.

## Controls

- Drag to pan; scroll/pinch or use + / − to zoom.
- Right-drag or Ctrl-drag to rotate and tilt. On touch screens, use two fingers to rotate or tilt.
- The compass indicates north; click it to restore north-up and drag it to rotate.
- The reset button returns to the initial harbour camera.
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
  components/HongKongMap.tsx   Map lifecycle, navigation, reset, loading/error UI
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

開啟 Identify 後點選地圖，程式將 WGS84 轉為 HK80，透過同源代理查詢地政總署的建築、地址與設施資料。點選屋頂時查詢的是地圖點位，不保證對應該建築。`server/lands.mjs` 僅轉發香港範圍內的 Identify 座標；無需 API key。正式部署仍應依流量需要設定限流。服務 URL：`https://www.map.gov.hk/gs/api/v1.0.0/identify?x={HK80_X}&y={HK80_Y}&lang=zh`。

完整擴充資料來源清單見 [香港地圖 API 清單](docs/HONG_KONG_APIS.zh-Hant.md)。

## 日常瀏覽的顯示取捨

地圖只載入輕量建築與按視野查詢的官方建築輪廓；不載入精細 3D Tiles。

| 視距（zoom） | 建築顯示                                  |
| ------------ | ----------------------------------------- |
| 12–13.5      | 淡色平面輪廓，保留街廓                    |
| 13.25–15.5    | 輪廓 + 來源高度至少 60 m 的高樓           |
| 15.5–16.5    | 輪廓 + 來源高度至少 20 m 的建築           |
| 16.5 以上    | 所有有高度資料且未標記 hide_3d 的立體建築 |

高度缺失仍保留平面輪廓，不臆造樓高。高樓篩選只是視覺層級，不代表官方地標分類。三段立體圖層的 zoom 範圍不重疊，不重複畫同一幢建築；切換門檻會出現更多建築。

繪製順序修正為地表／建築輪廓 → 道路 → 不透明立體建築 → 地名。原本將建築插入第一個文字層前，但該文字層是水域標籤，後面仍有道路，造成覆蓋。預設 pitch 改為 45°，減少遮住街道；道路按幹道／支路降低對比，小街名稱與方向箭頭留待放大後顯示。`VITE_MAP_PITCH` 仍可覆蓋預設。

篩選改善 GPU 繪製與視覺密度，不代表向量圖磚的下載量同比減少。

## 樓宇資料與標色

日常瀏覽在縮放 13.25–15 時，只載入視野內有關注分類的官方樓宇彩色平面輪廓；普通建築維持精簡的 OSM 顯示。放大至縮放 15 後，會載入視野內完整官方建築輪廓。點選可查看名稱、樓齡（入伙紙日期）、高度、層數、用途及曾發出、已遵從／撤銷／被取代的驗樓／修葺令紀錄。預設只標示修葺令及驗樓通知；左側可手動選擇其他關注類別。45–49 年為「接近 50 年」分組；灰色不代表安全或沒有維修需要。

更新資料：`npm run data:refresh`（Python 3），完成後重新整理地圖。正式部署須帶同 `data/` 目錄。詳細配對方式、18 區修葺令統計及「正在維修」資料限制，見 [樓宇資料說明](docs/BUILDING_DATA.zh-Hant.md)。
