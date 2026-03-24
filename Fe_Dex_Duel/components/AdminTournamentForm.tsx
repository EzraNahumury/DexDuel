"use client";

type Props = {
  pairSymbol: string;
  startTime: string;
  endTime: string;
  seasonNo: string;
  onChange: (field: "pairSymbol" | "startTime" | "endTime" | "seasonNo", value: string) => void;
  onCreate: () => Promise<void>;
  isCreating: boolean;
  disabled?: boolean;
};

export function AdminTournamentForm(props: Props) {
  const { pairSymbol, startTime, endTime, seasonNo, onChange, onCreate, isCreating, disabled } = props;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Create Tournament</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Pair Symbol
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="BTC/USDT"
            value={pairSymbol}
            onChange={(event) => onChange("pairSymbol", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Season No (optional)
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            type="number"
            min={0}
            value={seasonNo}
            onChange={(event) => onChange("seasonNo", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Start Time
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            type="datetime-local"
            value={startTime}
            onChange={(event) => onChange("startTime", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          End Time
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            type="datetime-local"
            value={endTime}
            onChange={(event) => onChange("endTime", event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={disabled || isCreating}
        className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCreating ? "Creating..." : "Create Tournament"}
      </button>
    </section>
  );
}
