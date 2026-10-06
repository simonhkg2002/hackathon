import type { BuildingInfo } from "../map/buildingRegistry";
import { copy, type Language } from "../i18n";
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
  language,
  onClose,
}: {
  building: BuildingInfo;
  language: Language;
  onClose: () => void;
}) {
  const t = copy[language];
  const records: Record[] = JSON.parse(b.records || "[]");
  return (
    <section
      aria-label={t.buildingInfo}
      className="absolute z-20 right-5 top-44 max-h-[65vh] w-[min(360px,calc(100%-40px))] overflow-auto rounded-xl border border-white/15 bg-[#101719]/95 p-5 text-sm shadow-xl"
    >
      <button
        onClick={onClose}
        aria-label={t.close}
        className="float-right px-2 text-slate-400"
      >
        ✕
      </button>
      <p className="mb-2 text-xs text-teal-300">{t.recordLabel}</p>
      <h2 className="mb-3 text-lg">
        {(language === "en" ? b.BuildingNameEN : b.BuildingNameTC) ||
          (language === "en" ? b.BuildingNameTC : b.BuildingNameEN) ||
          records[0]?.address ||
          t.unknownName}
      </h2>
      {b.noticeAddress && (
        <p className="mb-2 text-xs text-slate-400">
          {t.noticeAddress}: {b.noticeAddress}
        </p>
      )}
      <p className="mb-3 text-2xl">
        {b.age != null
          ? `${b.age} ${language === "en" ? "years" : "年"}`
          : t.ageUnknown}
        <span className="ml-2 text-xs text-slate-400">{t.ageBasis}</span>
      </p>
      <p>
        {t.height}:{" "}
        {b.height > 0
          ? `${b.height.toFixed(1)} ${language === "en" ? "m" : "米"}`
          : t.noData}{" "}
        ·{t.storeys}: {b.Storeys ?? t.noData}
      </p>
      <p className="mt-3 text-rose-300">
        {t.repairIssued}:{" "}
        {b.repair > 0 ? `${b.repair}${t.cumulativeBlock}` : t.noMatch}
      </p>
      <p className="mt-1 text-amber-200">
        {t.inspectionIssued}:{" "}
        {b.inspection > 0 ? `${b.inspection}${t.cumulativeBlock}` : t.noMatch}
      </p>
      <p className="mt-3 text-xs text-slate-300">{t.resolvedTitle}</p>
      <p className="mt-1 text-xs">
        {t.repair}: {b.repairResolved || t.noResolved} · {t.inspection}:{" "}
        {b.inspectionResolved || t.noResolved}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{t.warning}</p>
      {records.length === 0 && (
        <p className="mt-3 text-slate-400">{t.noPermit}</p>
      )}
      {records.length > 1 && (
        <p className="mt-3 text-amber-200">{t.multiplePermits}</p>
      )}
      {records.map((r, i) => (
        <div
          key={i}
          className="mt-3 border-t border-white/10 pt-3 text-xs leading-6"
        >
          <p>{r.address}</p>
          <p>
            {r.district ? `${r.district} · ` : ""}
            {r.usage || t.noData}
          </p>
          <p>
            {t.permit}: {r.op || t.noData} · {r.date || t.noData}
          </p>
          <p>
            {t.structureId}: {r.block}
          </p>
        </div>
      ))}
      <p className="mt-3 text-xs text-slate-500">
        {t.noticeUpdated}: {b.noticeUpdated || t.noData}
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
          {t.ageSource}
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-s26-order-1"
        >
          {t.repairSource}
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-s26-order-2"
        >
          {t.repairResolved}
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-mbis-s30b-notice-2"
        >
          {t.inspectionResolved}
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://data.gov.hk/en-data/dataset/hk-bd-opendata-mbis-s30b-notice-1"
        >
          {t.inspectionSource}
        </a>
      </div>
    </section>
  );
}
