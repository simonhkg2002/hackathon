import type { BuildingInfo } from "../map/buildingRegistry";
type Record = {
  block: string;
  address: string;
  op: string;
  date: string;
  usage: string;
  district: string;
};
export function BuildingPanel({
  building: b,
  onClose,
}: {
  building: BuildingInfo;
  onClose: () => void;
}) {
  const records: Record[] = JSON.parse(b.records || "[]");
  return (
    <section
      aria-label="樓宇資料"
      className="absolute z-20 right-5 top-44 max-h-[65vh] w-[min(360px,calc(100%-40px))] overflow-auto rounded-xl border border-white/15 bg-[#101719]/95 p-5 text-sm shadow-xl"
    >
      <button
        onClick={onClose}
        aria-label="關閉樓宇資料"
        className="float-right px-2 text-slate-400"
      >
        ✕
      </button>
      <p className="mb-2 text-xs text-teal-300">官方樓宇紀錄 · CSUID 配對</p>
      <h2 className="mb-3 text-lg">
        {b.BuildingNameTC ||
          b.BuildingNameEN ||
          records[0]?.address ||
          "未提供名稱的建築物"}
      </h2>
      {b.noticeAddress && (
        <p className="mb-2 text-xs text-slate-400">
          通知紀錄地址：{b.noticeAddress}
        </p>
      )}
      <p className="mb-3 text-2xl">
        {b.age != null ? `${b.age} 年` : "樓齡未能確定"}
        <span className="ml-2 text-xs text-slate-400">按入伙紙日期</span>
      </p>
      <p>
        建築高度：{b.height > 0 ? `${b.height.toFixed(1)} 米` : "未提供"} ·
        層數：{b.Storeys ?? "未提供"}
      </p>
      <p className="mt-3 text-rose-300">
        曾發出修葺令：
        {b.repair > 0
          ? `${b.repair} 份（相關樓座累計）`
          : "此資料集沒有配對紀錄"}
      </p>
      <p className="mt-1 text-amber-200">
        曾發出強制驗樓通知：
        {b.inspection > 0
          ? `${b.inspection} 份（相關樓座累計）`
          : "此資料集沒有配對紀錄"}
      </p>
      <p className="mt-3 text-xs text-slate-300">
        已遵從／撤銷／被取代紀錄（2024 年 5 月起）
      </p>
      <p className="mt-1 text-xs">
        修葺令：{b.repairResolved || "沒有配對紀錄"} · 驗樓通知：
        {b.inspectionResolved || "沒有配對紀錄"}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        發出紀錄從 2023 年 5 月起，處理紀錄從 2024 年 5
        月起；兩者不能相減推算尚未完成數量。正在大維修：未有可核實的即時資料。樓齡不代表樓宇不安全。
      </p>
      {records.length === 0 && (
        <p className="mt-3 text-slate-400">
          未配對到地政總署入伙紙紀錄，不以附近樓宇資料代替。
        </p>
      )}
      {records.length > 1 && (
        <p className="mt-3 text-amber-200">
          此輪廓對應多筆樓宇紀錄；日期不同時不合併成單一樓齡。
        </p>
      )}
      {records.map((r, i) => (
        <div
          key={i}
          className="mt-3 border-t border-white/10 pt-3 text-xs leading-6"
        >
          <p>{r.address}</p>
          <p>
            {r.district ? `${r.district} · ` : ""}
            {r.usage || "用途未提供"}
          </p>
          <p>
            入伙紙：{r.op || "未提供"} · {r.date || "未提供"}
          </p>
          <p>入伙紙結構 ID：{r.block}</p>
        </div>
      ))}
      <p className="mt-3 text-xs text-slate-500">
        通知資料更新：{b.noticeUpdated || "未提供"}
      </p>
      <p className="mt-4 break-all text-[10px] text-slate-500">
        CSUID {b.BuildingCSUID}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-teal-300">
        <a
          target="_blank"
          rel="noreferrer"
          href="https://portal.csdi.gov.hk/csdi-webpage/dataset/landsd_rcd_1637211194312_35158"
        >
          樓齡來源
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-s26-order-1"
        >
          修葺令來源
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-s26-order-2"
        >
          修葺處理
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-mbis-s30b-notice-2"
        >
          驗樓處理
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-mbis-s30b-notice-1"
        >
          驗樓來源
        </a>
      </div>
    </section>
  );
}
