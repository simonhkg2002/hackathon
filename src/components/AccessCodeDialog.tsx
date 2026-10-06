import { useEffect, useRef, useState, type FormEvent } from "react";
import { copy, type Language } from "../i18n";

export function AccessCodeDialog({
  language,
  onClose,
}: {
  language: Language;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRef.current?.focus();
    return () => dialog?.close();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (/^[0-9]{6}$/.test(code)) setPending(true);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="sea-view-access-title"
      className="m-auto w-[min(400px,calc(100%-32px))] rounded-xl border border-white/20 bg-[#101719] p-0 text-slate-100 shadow-2xl backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="p-6">
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
        <h2 id="sea-view-access-title" className="text-xl font-semibold">
          {t.accessTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{t.accessHint}</p>
        <label
          htmlFor="sea-view-access-code"
          className="mt-6 block text-sm text-slate-200"
        >
          {t.accessLabel}
        </label>
        <input
          id="sea-view-access-code"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            setPending(false);
          }}
          placeholder="000000"
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.35em] text-white outline-none focus:border-teal-300"
        />
        <p className="mt-2 text-xs text-slate-400">{t.accessDigits}</p>
        {pending && (
          <p role="status" className="mt-4 text-sm text-amber-200">
            {t.accessPending}
          </p>
        )}
        <button
          type="submit"
          disabled={code.length !== 6}
          className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.accessContinue}
        </button>
        <a
          href="/sea-view-structure-preview.html"
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-center text-xs text-teal-300 underline underline-offset-2 hover:text-teal-200"
        >
          {t.structurePreview}
        </a>
      </form>
    </dialog>
  );
}
