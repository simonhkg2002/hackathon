# Hong Kong 3D Map

A minimal full-window React + TypeScript map, built with Vite, MapLibre GL JS and Tailwind CSS. The default camera looks across Victoria Harbour at a 45° pitch. OpenFreeMap's dark vector style supplies land, coastline, water, roads and labels from OpenStreetMap-compatible data.

## Run locally

Use Node.js 24 LTS (the tests use built-in TypeScript support).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The default OpenStreetMap buildings and Identify work without a key. The official 3D Spatial Data mode requires `LANDSD_API_KEY` in `.env.local`. Internet access is required for public vector tiles, styles, fonts and sprites; this is not an offline map. WebGL must be enabled.

```sh
npm run build    # TypeScript check and production build
npm run preview  # Serve the production build locally
npm run lint
npm run format
```

For the complete app, run `npm run build` then `npm start`. The Node server serves `dist/` and the same-origin Lands Department proxy on `127.0.0.1:4173` (override `HOST` and `PORT` for your deployment). A static-only host cannot provide Identify or official 3D models without an equivalent backend. `VITE_*` settings are embedded at build time; the server-only key is read at startup. Restart after changing it.

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

The extrusion layer uses the provider's `render_height` and `render_min_height` values directly, without exaggeration or generated skyscrapers. Missing or nonnumeric heights resolve to zero, leaving those footprints flat. OpenMapTiles can derive render heights from OSM levels or provider defaults when surveyed heights are unavailable, so these values are source-based, not a guarantee of surveyed accuracy. Coverage varies by location and zoom. Buildings are shown by zoom tier, above roads and below labels. The basic mode uses a flat ground plane. Spatial mode adds elevation terrain at its true scale.

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

## 官方 3D 模型與 Identify

- **3D Spatial Data**：載入地政總署的建築與基建 3D Tiles，保留原始模型幾何和高度。
- **Identify**：開啟後點選地圖，將 WGS84 轉為 HK80，查詢該地理位置的建築、地址與設施。這不是模型物件 ID 查詢；點選屋頂時的地面位置可能與建築位置不同。
- 支援載入、空結果、錯誤、重試、關閉查詢，以及切換模型後資源清理。

### Key 與服務

複製 `.env.example` 為 `.env.local`，設定 `LANDSD_API_KEY=你的地政總署key`。可從官方文件了解申請方式；文件亦提供公開範例 key 作評估，正式部署應使用自己的 key。本機若已有 `.env.local`，請只更新必要欄位，避免覆蓋其他設定。

Key 僅由 `server/lands.mjs` 加入官方請求，不會編入前端或傳給瀏覽器。不要改成 `VITE_LANDSD_API_KEY`。代理只允許指定的官方模型路徑和香港範圍的 Identify 座標；公開部署仍應依自己的流量需求設定限流。

| 服務     | 官方 URL                                                                      |
| -------- | ----------------------------------------------------------------------------- |
| 建築     | `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/building/tileset.json`        |
| 基建     | `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/infrastructure/tileset.json`  |
| Identify | `https://www.map.gov.hk/gs/api/v1.0.0/identify?x={HK80_X}&y={HK80_Y}&lang=zh` |

3D 模型使用 deck.gl 在 MapLibre 上疊加顯示。為控制記憶體和下載量，預設仍為基本建築，官方模式按視野逐步載入，採 4 px 畫面誤差門檻、每組模型 256 MB 快取預算與最多 8 個並行請求；首次載入可需數十秒。模型涵蓋範圍、更新時間與幾何精度依官方來源。記憶體壓力升高時可降低細節，以免無限制載入。建築改用淺藍灰建築示意材質，以實際面的法線計算方向光，強化牆面、屋頂與轉角的對比；不更改模型幾何和高度。遠處仍會使用簡化模型，原始資料中的形狀誤差不會因此自動修復。實景模式已移除。

Spatial 模式使用統一材質，因此停用 glTF 圖像下載／解碼，並在 GPU 上傳前移除不用的貼圖引用。嵌入模型二進位檔案的圖像位元組仍會隨模型下載，但不再執行 Basis/KTX2 貼圖解碼。保留實際頂點、索引、高度與模型位置。

伺服器對完整成功的 3D 回應提供 128 MB 記憶體 LRU 快取（單檔最多 16 MB、1 小時期限），並保留版本參數。大型檔案仍串流回傳，不加入快取；取消／失敗的回應不快取。`X-Lands-Cache: HIT/MISS` 可用於診斷，伺服器重啟會清空快取。瀏覽器也保留 1 小時的 HTTP 快取。

模型狀態區分已顯示與目前視野已補齊。開發模式 Console 的 `Spatial view settled in …` 記錄目前視野載入完成的時間（包含約 1 秒穩定觀察期），不能視為所有區域的效能保證。

### 新增模組與驗證

- `src/map/ArchitecturalScenegraphLayer.ts`：逐面明暗與統一建築材質。
- `src/map/officialModels.ts`：官方 3D Tiles、載入狀態、資源管理。
- `src/services/identify.ts`：座標轉換、可取消的查詢和回傳解析。
- `src/components/IdentifyPanel.tsx`：繁體中文結果面板。
- `server/lands.mjs`：固定上游的 server-only key 代理。
- `server/index.mjs`：production 靜態檔案與 API 伺服器。
- `npm test`：座標轉換、回傳解析及代理邊界測試。

完整擴充資料來源清單見 [香港地圖 API 清單](docs/HONG_KONG_APIS.zh-Hant.md)。

官方說明：[3D Spatial Data](https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-spatial-data-api)、[Identify](https://portal.csdi.gov.hk/csdi-webpage/apidoc/IdentifyAPI)。

## 山體與建築高度

Spatial 模式啟用 MapLibre `raster-dem` Terrarium 地形及 hillshade，倍率固定為 1。道路、地名和地表會貼合地形；官方建築與基建仍使用原有絕對高度，不額外加一次地面高度。deck.gl 與 MapLibre 共用 WebGL 深度，以處理山體與建築的前後遮擋。切回基本模式會關閉地形。

高程來源：[Mapzen Terrain Tiles / AWS](https://registry.opendata.aws/terrain-tiles/)，香港使用全球 DEM 覆蓋，無需 API key；可用 `VITE_TERRAIN_URL` 更換相同 Terrarium 編碼的來源（256 px、最高 zoom 14）。[來源與 attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) 包括 USGS / NOAA，亦顯示於地圖。

DEM 不是地政總署的精細地盤地形，來源解析度、年代及垂直基準可能與建築資料有差別。山坡整體會呈現，但個別地台、擋土牆、山路與建築底座仍可能有局部間隙／穿插；不以任意移動整幢建築掩蓋差異。若需要精確接地，下一步需換入官方精細 DTM 並確認高程基準。

`src/map/deckCompatibility.ts` 隔離了 deck.gl 9.4 對舊 MapLibre `transform` 路徑的相容處理，讀取 MapLibre 6 的即時渲染相機。已固定 MapLibre 6.11.2；升級任一渲染套件時需重新驗證山區平移、縮放和模式切換。

## 日常瀏覽的顯示取捨

預設為「日常瀏覽 · 輕量建築」，沿用同一組向量圖磚，不下載官方 3D Tiles，也不預先載入 deck.gl。需要原始精細建築與山體時，手動選擇「精細模型 · 3D Spatial Data」。切回日常模式會釋放精細模型並恢復輪廓與分級建築。

| 視距（zoom） | 建築顯示                                  |
| ------------ | ----------------------------------------- |
| 12–13.5      | 淡色平面輪廓，保留街廓                    |
| 13.25–15.5    | 輪廓 + 來源高度至少 60 m 的高樓           |
| 15.5–16.5    | 輪廓 + 來源高度至少 20 m 的建築           |
| 16.5 以上    | 所有有高度資料且未標記 hide_3d 的立體建築 |

高度缺失仍保留平面輪廓，不臆造樓高。高樓篩選只是視覺層級，不代表官方地標分類。三段立體圖層的 zoom 範圍不重疊，不重複畫同一幢建築；切換門檻會出現更多建築。

繪製順序修正為地表／建築輪廓 → 道路 → 不透明立體建築 → 地名。原本將建築插入第一個文字層前，但該文字層是水域標籤，後面仍有道路，造成覆蓋。預設 pitch 改為 45°，減少遮住街道；道路按幹道／支路降低對比，小街名稱與方向箭頭留待放大後顯示。`VITE_MAP_PITCH` 仍可覆蓋預設。

篩選改善 GPU 繪製與視覺密度，不代表向量圖磚的下載量同比減少。真正減少首次載入的是精細模型按需下載：本次 production 主程式 gzip 約 406 KB，精細模型另約 352 KB（不含 MapLibre worker、底圖與模型資料），相比原本主程式約 758 KB。

## 樓宇資料與標色

日常瀏覽在縮放 13.25–15 時，只載入視野內有關注分類的官方樓宇彩色平面輪廓；普通建築維持精簡的 OSM 顯示。放大至縮放 15 後，會載入視野內完整官方建築輪廓。點選可查看名稱、樓齡（入伙紙日期）、高度、層數、用途及曾發出、已遵從／撤銷／被取代的驗樓／修葺令紀錄。左側可選擇關注類別。45–49 年為「接近 50 年」分組；灰色不代表安全或沒有維修需要。

更新資料：`npm run data:refresh`（Python 3），完成後重新整理地圖。正式部署須帶同 `data/` 目錄。詳細配對方式、來源及「正在維修」資料限制，見 [樓宇資料說明](docs/BUILDING_DATA.zh-Hant.md)。
