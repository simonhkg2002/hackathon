import { useEffect, useRef } from "react";
import { copy, type Language } from "../i18n";

export function AccessCodeDialog({
  language,
  onClose,
  onContinue,
}: {
  language: Language;
  onClose: () => void;
  onContinue: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = copy[language];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="demo-access-title"
      className="m-auto w-[min(400px,calc(100%-32px))] rounded-xl border border-white/20 bg-[#101719] p-6 text-slate-100 shadow-2xl backdrop:bg-black/70"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="float-right rounded px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-white"
      >
        ✕
      </button>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-teal-300">
        {t.demoBuilding}
      </p>
      <h2 id="demo-access-title" className="text-xl font-semibold">
        {t.accessTitle}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{t.accessHint}</p>
      <p className="mt-5 rounded-lg border border-teal-400/25 bg-teal-950/25 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-teal-100">
        000000
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-600"
      >
        {t.accessContinue}
      </button>
    </dialog>
  );
}
