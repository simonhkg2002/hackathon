import { useState, type FormEvent } from "react";
import { copy, type Language } from "../i18n";
import {
  submitDemoTicket,
  ticketCategories,
  ticketLocations,
  type DemoTicket,
  type ModelPoint,
  type TicketCategory,
  type TicketLocation,
} from "../services/demoTickets";

const locationNames: Record<Language, Record<TicketLocation, string>> = {
  zh: {
    unit: "單位內",
    corridor: "公共走廊",
    lift: "升降機",
    stairs: "樓梯",
    "wet-area": "濕區／水管",
    ceiling: "天花",
  },
  en: {
    unit: "Inside unit",
    corridor: "Common corridor",
    lift: "Lift",
    stairs: "Stairs",
    "wet-area": "Wet area / plumbing",
    ceiling: "Ceiling",
  },
};
const categoryNames: Record<Language, Record<TicketCategory, string>> = {
  zh: {
    ceiling: "天花／批盪",
    water: "漏水／水管",
    electrical: "電力設備",
    concrete: "混凝土／外牆",
    door: "門窗",
    other: "其他",
  },
  en: {
    ceiling: "Ceiling / plaster",
    water: "Leak / plumbing",
    electrical: "Electrical",
    concrete: "Concrete / façade",
    door: "Door / window",
    other: "Other",
  },
};

export { locationNames };

export function RepairTickets({
  language,
  floor,
  tickets,
  live,
  loadError,
  location,
  onLocationChange,
  modelPoint,
  onModelPointChange,
  onSubmitted,
}: {
  language: Language;
  floor: number;
  tickets: DemoTicket[];
  live: boolean;
  loadError: boolean;
  location: TicketLocation;
  onLocationChange: (location: TicketLocation) => void;
  modelPoint: ModelPoint | null;
  onModelPointChange: (point: ModelPoint | null) => void;
  onSubmitted: (ticket: DemoTicket) => void;
}) {
  const t = copy[language];
  const [category, setCategory] = useState<TicketCategory>("ceiling");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [success, setSuccess] = useState(false);
  const floorTickets = tickets.filter((ticket) => ticket.floor === floor);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(false);
    setSuccess(false);
    try {
      const ticket = await submitDemoTicket({
        floor,
        location,
        category,
        description: description.trim(),
        modelPoint,
      });
      onSubmitted(ticket);
      setDescription("");
      onModelPointChange(null);
      setSuccess(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="tickets-title"
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="rounded-xl border border-white/10 bg-[#18272d] p-5 text-sm"
      >
        <h3 id="tickets-title" className="text-lg font-semibold text-teal-100">
          {t.ticketReportTitle}
        </h3>
        <p className="mt-2 text-xs leading-5 text-amber-100">
          {t.ticketPrivacy}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-slate-300">
            {t.ticketLocation}
            <select
              value={location}
              onChange={(e) =>
                onLocationChange(e.target.value as TicketLocation)
              }
              className="mt-1 block w-full rounded-lg border border-white/20 bg-[#101719] px-3 py-2 text-white"
            >
              {ticketLocations.map((key) => (
                <option key={key} value={key}>
                  {locationNames[language][key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-slate-300">
            {t.ticketCategory}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="mt-1 block w-full rounded-lg border border-white/20 bg-[#101719] px-3 py-2 text-white"
            >
              {ticketCategories.map((key) => (
                <option key={key} value={key}>
                  {categoryNames[language][key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-300">
          <span>{modelPoint ? t.ticketPointSelected : t.ticketPointHint}</span>
          {modelPoint && (
            <button
              type="button"
              onClick={() => onModelPointChange(null)}
              className="text-teal-300 underline"
            >
              {t.ticketPointClear}
            </button>
          )}
        </div>
        <label className="mt-3 block text-slate-300">
          {t.ticketDescription}
          <textarea
            required
            minLength={10}
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSuccess(false);
            }}
            placeholder={t.ticketPlaceholder}
            className="mt-1 block w-full resize-y rounded-lg border border-white/20 bg-[#101719] px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {description.length}/500
          </span>
          <button
            type="submit"
            disabled={submitting || description.trim().length < 10}
            className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-600 disabled:opacity-40"
          >
            {submitting ? t.ticketSubmitting : t.ticketSubmit}
          </button>
        </div>
        {submitError && (
          <p role="alert" className="mt-2 text-rose-300">
            {t.ticketSubmitError}
          </p>
        )}
        {success && (
          <p role="status" className="mt-2 text-teal-200">
            {t.ticketSuccess}
          </p>
        )}
      </form>
      <div className="rounded-xl border border-white/10 bg-[#18272d] p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-teal-100">
            {t.ticketListTitle} · {floorTickets.length}
          </h3>
          <span
            role="status"
            className={`text-xs ${live ? "text-teal-300" : "text-amber-200"}`}
          >
            {live ? t.ticketLive : t.ticketReconnecting}
          </span>
        </div>
        {loadError && (
          <p role="alert" className="mt-3 text-amber-200">
            {t.ticketLoadError}
          </p>
        )}
        {floorTickets.length === 0 ? (
          <p className="mt-4 text-slate-400">{t.ticketEmpty}</p>
        ) : (
          <ol className="mt-3 max-h-72 space-y-3 overflow-auto">
            {floorTickets.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-lg border border-white/10 bg-[#101719] p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {categoryNames[language][ticket.category]} ·{" "}
                    {locationNames[language][ticket.location]}
                  </strong>
                  <span className="text-xs text-amber-200">
                    {t.ticketStatusNew}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">
                  {ticket.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Intl.DateTimeFormat(
                    language === "en" ? "en-HK" : "zh-HK",
                    { dateStyle: "short", timeStyle: "short" },
                  ).format(new Date(ticket.createdAt))}{" "}
                  · #{ticket.id.slice(0, 8)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
