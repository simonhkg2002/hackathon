import { lazy, Suspense, useState } from "react";
import { copy, type Language } from "../i18n";
import { DEMO_BUILDING_CSUID } from "../map/demoBuilding";
import { publicFloorPlans } from "../map/floorPlans";

const Structure3DView = lazy(() =>
  import("./Structure3DView").then((module) => ({
    default: module.Structure3DView,
  })),
);

export function LayerTwoView({
  language,
  onClose,
}: {
  language: Language;
  onClose: () => void;
}) {
  const t = copy[language];
  const plan = publicFloorPlans[DEMO_BUILDING_CSUID];
  const [view, setView] = useState<"3d" | "plan">("3d");

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="layer-two-title"
      className="absolute inset-0 z-30 flex flex-col overflow-auto bg-[#101719] text-slate-100"
    >
      <header className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
            {t.layerTwoEyebrow}
          </p>
          <h2 id="layer-two-title" className="mt-1 text-xl font-semibold">
            {t.demoBuilding}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            CSUID {DEMO_BUILDING_CSUID}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-slate-700"
        >
          ← {t.backToMap}
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-5 sm:p-8">
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
          {t.layerTwoPublicNotice}
        </div>
        <div role="tablist" aria-label={t.layerTwoViews} className="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={view === "3d"}
            onClick={() => setView("3d")}
            className={`rounded-lg px-4 py-2 text-sm ${view === "3d" ? "bg-teal-700 text-white" : "border border-white/15 text-slate-300"}`}
          >
            {t.structure3dTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "plan"}
            onClick={() => setView("plan")}
            className={`rounded-lg px-4 py-2 text-sm ${view === "plan" ? "bg-teal-700 text-white" : "border border-white/15 text-slate-300"}`}
          >
            {t.floorPlanTab}
          </button>
        </div>
        {view === "3d" ? (
          <Suspense
            fallback={
              <p role="status" className="py-20 text-center text-slate-300">
                {t.loading3d}
              </p>
            }
          >
            <Structure3DView language={language} />
          </Suspense>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-lg font-medium">{t.floorPlanTitle}</h3>
              <div className="flex gap-4 text-sm text-teal-300">
                <a
                  href={plan.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {t.openFloorPlan}
                </a>
                <a
                  href={plan.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {plan.source} {t.floorPlanSource}
                </a>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl border border-white/10 bg-white p-3">
              <img
                src={plan.imageUrl}
                alt={t.floorPlanAlt}
                className="max-h-[68dvh] max-w-full object-contain"
              />
            </div>
            <p className="text-xs leading-5 text-slate-400">
              {t.floorPlanCaution}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
