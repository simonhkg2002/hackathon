import type { Facility } from "../services/identify";
import { copy, type Language } from "../i18n";
export interface IdentifyState {
  coordinate: [number, number];
  loading: boolean;
  facilities: Facility[];
  error?: string;
}
export function IdentifyPanel({
  state,
  language,
  onClose,
  onRetry,
}: {
  state: IdentifyState;
  language: Language;
  onClose: () => void;
  onRetry: () => void;
}) {
  const t = copy[language];
  return (
    <aside
      aria-label={t.identifyTitle}
      className="absolute z-20 bottom-14 right-4 z-10 max-h-[55dvh] w-[min(360px,calc(100%-32px))] overflow-y-auto rounded-xl border border-white/15 bg-[#101719]/95 p-4 text-sm shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-teal-200">{t.identifyTitle}</h2>
        <button
          aria-label={t.close}
          onClick={onClose}
          className="rounded px-3 py-1 hover:bg-slate-700"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {state.coordinate.map((n) => n.toFixed(5)).join(", ")}
      </p>
      <div aria-live="polite" className="mt-3">
        {state.loading ? (
          <p>{t.identifyLoading}</p>
        ) : state.error ? (
          <>
            <p role="alert" className="text-amber-200">
              {state.error}
            </p>
            <button
              onClick={onRetry}
              className="mt-2 rounded bg-slate-700 px-3 py-2"
            >
              {t.identifyRetry}
            </button>
          </>
        ) : state.facilities.length === 0 ? (
          <p className="text-slate-300">{t.identifyEmpty}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">
              {language === "en"
                ? `${state.facilities.length} results`
                : `找到 ${state.facilities.length} 項資料`}
            </p>
            {state.facilities.map((f) => (
              <article key={f.id} className="border-t border-white/10 py-3">
                <p className="text-xs text-teal-300">{f.category}</p>
                <h3 className="mt-1 font-medium">{f.name}</h3>
                {f.address !== f.name && (
                  <p className="mt-1 text-slate-300">{f.address}</p>
                )}
                {f.details.length > 0 && (
                  <details className="mt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer">
                      {t.identifyDetails}
                    </summary>
                    <dl className="mt-2 space-y-2">
                      {f.details.map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd className="text-slate-200">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </article>
            ))}
          </>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">{t.identifyFooter}</p>
    </aside>
  );
}
