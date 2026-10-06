# 海景大廈第二層：資料盤點與結構示意

目標只限離島區梅窩銀運路 1 號的海景大廈（Sea View Building，官方 CSUID `1816213942T20050430`）。[互動結構示意](../public/sea-view-structure-preview.html)使用現有政府公開外輪廓製作；在本機開發伺服器可用 `/sea-view-structure-preview.html` 開啟。它不是核准圖則，也沒有單位、樓梯、電路或水管的實際位置。

## 目前已取得並可核實

| 資料           | 海景大廈值                                  | 依據與限制                                      |
| -------------- | ------------------------------------------- | ----------------------------------------------- |
| 建築外輪廓     | 官方 3D Spatial Data 多邊形                 | 可推得地面投影外輪廓，不能推得室內間隔          |
| 高度           | 20.8 米（TopHeight 25.5 減 BaseHeight 4.7） | 官方資料；不是每層的實測層高                    |
| 層數           | 6                                           | 官方 Storeys 欄位；不能直接判定各樓層名稱或用途 |
| 入伙紙         | NT84/86，1986-07-18                         | 地政總署資料；日期與圖則版本需分開看            |
| 修葺令         | 相關樓座有 1 份發出紀錄                     | 不能證明正在施工或仍未遵從                      |
| 外輪廓投影面積 | 約 607 平方米                               | 由 GeoJSON 頂點近似計算，非實用面積或總樓面面積 |

本站的單次資料快照位於 [`public/repair-geometries/islands-district.json`](../public/repair-geometries/islands-district.json)，來源為[地政總署的 3D Spatial Data](https://portal.csdi.gov.hk/csdi-webpage/dataset/landsd_rcd_1637211194312_35158)及現有樓宇登記資料。

## 圖則搜尋結果

我找到[規劃署的梅窩位置圖](https://www.pland.gov.hk/file/resources/vsp/vsp_list/pdf/NTHYKSouthernDistrictSecondarySchool.pdf)，圖上標有海景大廈，但它只是地點圖，不是室內平面圖。公開搜尋中未找到能確認屬於本樓、可直接下載的核准室內圖則。

可行的正式取得路徑是[屋宇署 BRAVO](https://www.bd.gov.hk/en/resources/online-tools/BRAVO-online-building-records/index.html)。其[常見問題](https://bravo.bd.gov.hk/faq)列明可查閱私人物業的最新核准圖則和相關文件，但須註冊帳戶，查閱／複印涉及費用，所得資料亦應按申報用途使用。搜尋時可用地址「1 Ngan Wan Road, Mui Wo」、樓名「Sea View Building」及入伙紙號碼「NT84/86」互相核對。取得後仍須確認圖則日期、樓層、比例尺、修訂版本，以及是否可用於本產品。

## 用電與用水

目前沒有海景大廈或個別單位的真實用量。中電的[用量查閱說明](https://www.clp.com.hk/en/residential/consumption-residential/check-consumption)指出，用戶須登入其帳戶查看帳單及（裝有智能電錶時的）時段用量；[機電工程署](https://eui.emsd.gov.hk/en/Faqs.html)亦說明電力公司不向其提供個別用戶或樓宇的用電數據。水務署的[水務易](https://www.wsd.gov.hk/en/customer-services/ewater-mobile-app/index.html)及[電子服務](https://www.esd.wsd.gov.hk/)提供帳戶持有人查閱帳單／用水紀錄的途徑。這些都不是可按地址匿名抓取的公開資料。

第二層應先分清「整棟共用設施」與「個別住戶」。住戶用量必須由相應帳戶持有人授權提供；一個全棟共用的六位數字碼不足以授權查看其他住戶的用量。正式接入時，圖則與用量應只由伺服器在身份和權限核實後提供，不放在 `public/`、前端程式碼或地圖快取內。需要明確的用途、資料保留期限、撤銷途徑與存取紀錄。

## 示意圖的邊界

互動圖把官方外輪廓複製成六個等距層板，讓人理解未來可如何逐層查看。等距層板純屬視覺化假設，不代表真正的樓板高度。沒有核准圖則前，不應畫出房間、單位、逃生路線、機電井、水電管線或樓宇能源圖表。取得經授權圖則後，才可以按比例尺數位化樓層輪廓，並把每個圖形連回其來源頁與版本。
