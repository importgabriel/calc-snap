"use client";

// CalcEntry shape matches the interface defined by the api agent:
// { id: string, expression: string, result: string, createdAt: string }
export interface CalcEntry {
  id: string;
  expression: string;
  result: string;
  createdAt: string;
}

interface HistoryPanelProps {
  entries: CalcEntry[];
  source: "db" | "mock";
  isLoading: boolean;
  /** Called when the user clicks an entry result to reuse it */
  onSelect: (result: string) => void;
  /** Called to clear all history */
  onClear: () => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function HistoryPanel({
  entries,
  source,
  isLoading,
  onSelect,
  onClear,
}: HistoryPanelProps) {
  return (
    <aside className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 w-64 min-w-[16rem]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
            History
          </h2>
          {source === "mock" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 font-mono"
              title="Using local mock data — no database connected"
            >
              demo
            </span>
          )}
        </div>

        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
            aria-label="Clear history"
          >
            Clear
          </button>
        )}
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto history-scroll">
        {isLoading ? (
          <LoadingSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => onSelect(entry.result)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800/60 transition-colors group focus:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-amber-400"
                  title="Click to use this result"
                >
                  <p className="text-xs text-zinc-500 font-mono truncate group-hover:text-zinc-400 transition-colors">
                    {entry.expression}
                  </p>
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <p className="text-base font-light text-zinc-100 truncate">
                      {entry.result}
                    </p>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer hint */}
      <p className="px-4 py-2 text-[10px] text-zinc-600 border-t border-zinc-800 shrink-0 text-center">
        Click an entry to reuse it
      </p>
    </aside>
  );
}

function LoadingSkeleton() {
  return (
    <ul className="divide-y divide-zinc-800/60">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-4 py-3 space-y-1.5">
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg select-none">
        =
      </div>
      <p className="text-sm text-zinc-500">
        Your calculations will appear here.
      </p>
    </div>
  );
}
