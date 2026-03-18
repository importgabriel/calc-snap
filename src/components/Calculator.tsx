"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Button, { ButtonVariant } from "./Button";
import Display from "./Display";
import HistoryPanel, { CalcEntry } from "./HistoryPanel";

// ---------------------------------------------------------------------------
// Types matching the api agent's shared interfaces
// ---------------------------------------------------------------------------
interface SaveHistoryRequest {
  expression: string;
  result: string;
}

interface HistoryResponse {
  entries: CalcEntry[];
  source: "db" | "mock";
}

// ---------------------------------------------------------------------------
// Mock history — shown when the API is unavailable
// ---------------------------------------------------------------------------
const MOCK_HISTORY: CalcEntry[] = [
  {
    id: "mock-1",
    expression: "1024 × 2",
    result: "2048",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "mock-2",
    expression: "500 − 37.5",
    result: "462.5",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "mock-3",
    expression: "9 × 9",
    result: "81",
    createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
  },
  {
    id: "mock-4",
    expression: "355 ÷ 113",
    result: "3.1415929",
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "mock-5",
    expression: "42 + 58",
    result: "100",
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Safe arithmetic evaluator
// ---------------------------------------------------------------------------
function safeEvaluate(expression: string): number | null {
  // Map display symbols to JS operators
  const jsExpr = expression
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/−/g, "-");

  // Whitelist: digits, basic operators, decimal, parens, spaces
  if (/[^0-9+\-*/.() ]/.test(jsExpr)) return null;

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${jsExpr})`)() as unknown;
    if (typeof result === "number" && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

/** Format a number to ≤9 significant digits, no trailing zeros. */
function fmt(n: number): string {
  return parseFloat(n.toPrecision(9)).toString();
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
type Operator = "+" | "−" | "×" | "÷";

interface CalcState {
  display: string;
  expression: string;
  operand1: string | null;
  operator: Operator | null;
  waitingForOperand2: boolean;
  justCalculated: boolean;
}

const INITIAL: CalcState = {
  display: "0",
  expression: "",
  operand1: null,
  operator: null,
  waitingForOperand2: false,
  justCalculated: false,
};

type CalcAction =
  | { type: "DIGIT"; digit: string }
  | { type: "DECIMAL" }
  | { type: "OPERATOR"; operator: Operator }
  | { type: "EQUALS" }
  | { type: "CLEAR" }
  | { type: "TOGGLE_SIGN" }
  | { type: "PERCENT" }
  | { type: "INJECT"; value: string };

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "INJECT": {
      const n = parseFloat(action.value.replace(/,/g, ""));
      const safe = isNaN(n) ? action.value : fmt(n);
      return { ...INITIAL, display: safe, operand1: safe, justCalculated: true };
    }

    case "CLEAR":
      return { ...INITIAL };

    case "DIGIT": {
      const { digit } = action;
      if (state.waitingForOperand2) {
        return {
          ...state,
          display: digit === "0" ? "0" : digit,
          waitingForOperand2: false,
          justCalculated: false,
        };
      }
      if (state.justCalculated) {
        return { ...INITIAL, display: digit === "0" ? "0" : digit };
      }
      if (state.display === "0" && digit !== ".") {
        return { ...state, display: digit };
      }
      if (state.display.replace("-", "").length >= 9) return state;
      return { ...state, display: state.display + digit, justCalculated: false };
    }

    case "DECIMAL": {
      if (state.waitingForOperand2) {
        return { ...state, display: "0.", waitingForOperand2: false, justCalculated: false };
      }
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + ".", justCalculated: false };
    }

    case "TOGGLE_SIGN": {
      if (state.display === "0") return state;
      const toggled = state.display.startsWith("-")
        ? state.display.slice(1)
        : "-" + state.display;
      return { ...state, display: toggled };
    }

    case "PERCENT": {
      const n = parseFloat(state.display);
      if (isNaN(n)) return state;
      return { ...state, display: fmt(n / 100), justCalculated: false };
    }

    case "OPERATOR": {
      const { operator } = action;
      const current = state.display;
      // Chain: already have op+op1, compute and continue
      if (state.operator && state.operand1 && !state.waitingForOperand2) {
        const expr = `${state.operand1}${state.operator}${current}`;
        const result = safeEvaluate(expr);
        if (result === null) return state;
        const rs = fmt(result);
        return {
          display: rs,
          expression: `${rs} ${operator}`,
          operand1: rs,
          operator,
          waitingForOperand2: true,
          justCalculated: false,
        };
      }
      return {
        ...state,
        expression: `${current} ${operator}`,
        operand1: current,
        operator,
        waitingForOperand2: true,
        justCalculated: false,
      };
    }

    case "EQUALS": {
      if (!state.operator || !state.operand1) {
        return { ...state, expression: `${state.display} =`, justCalculated: true };
      }
      const op2 = state.waitingForOperand2 ? state.operand1 : state.display;
      const expr = `${state.operand1}${state.operator}${op2}`;
      const result = safeEvaluate(expr);
      if (result === null) {
        return { ...INITIAL, display: "Error", expression: `${expr} =` };
      }
      const rs = fmt(result);
      return {
        display: rs,
        expression: `${state.operand1} ${state.operator} ${op2} =`,
        operand1: rs,
        operator: null,
        waitingForOperand2: false,
        justCalculated: true,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Button grid definition
// ---------------------------------------------------------------------------
interface ButtonDef {
  label: string;
  variant: ButtonVariant;
  action: CalcAction;
  wide?: boolean;
  ariaLabel?: string;
}

const BUTTONS: ButtonDef[] = [
  // Row 1 — utility
  { label: "AC",  variant: "action",   action: { type: "CLEAR" },                   ariaLabel: "All clear" },
  { label: "+/−", variant: "action",   action: { type: "TOGGLE_SIGN" },             ariaLabel: "Toggle sign" },
  { label: "%",   variant: "action",   action: { type: "PERCENT" },                 ariaLabel: "Percent" },
  { label: "÷",   variant: "operator", action: { type: "OPERATOR", operator: "÷" }, ariaLabel: "Divide" },
  // Row 2
  { label: "7",   variant: "digit",    action: { type: "DIGIT", digit: "7" } },
  { label: "8",   variant: "digit",    action: { type: "DIGIT", digit: "8" } },
  { label: "9",   variant: "digit",    action: { type: "DIGIT", digit: "9" } },
  { label: "×",   variant: "operator", action: { type: "OPERATOR", operator: "×" }, ariaLabel: "Multiply" },
  // Row 3
  { label: "4",   variant: "digit",    action: { type: "DIGIT", digit: "4" } },
  { label: "5",   variant: "digit",    action: { type: "DIGIT", digit: "5" } },
  { label: "6",   variant: "digit",    action: { type: "DIGIT", digit: "6" } },
  { label: "−",   variant: "operator", action: { type: "OPERATOR", operator: "−" }, ariaLabel: "Subtract" },
  // Row 4
  { label: "1",   variant: "digit",    action: { type: "DIGIT", digit: "1" } },
  { label: "2",   variant: "digit",    action: { type: "DIGIT", digit: "2" } },
  { label: "3",   variant: "digit",    action: { type: "DIGIT", digit: "3" } },
  { label: "+",   variant: "operator", action: { type: "OPERATOR", operator: "+" }, ariaLabel: "Add" },
  // Row 5
  { label: "0",   variant: "zero",     action: { type: "DIGIT", digit: "0" },       wide: true, ariaLabel: "Zero" },
  { label: ".",   variant: "digit",    action: { type: "DECIMAL" },                 ariaLabel: "Decimal point" },
  { label: "=",   variant: "equals",   action: { type: "EQUALS" },                  ariaLabel: "Equals" },
];

// ---------------------------------------------------------------------------
// API helpers (best-effort, graceful degradation)
// ---------------------------------------------------------------------------
async function apiFetchHistory(): Promise<HistoryResponse> {
  const res = await fetch("/api/history", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<HistoryResponse>;
}

async function apiSaveHistory(payload: SaveHistoryRequest): Promise<void> {
  await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [entries, setEntries] = useState<CalcEntry[]>([]);
  const [historySource, setHistorySource] = useState<"db" | "mock">("mock");
  const [historyLoading, setHistoryLoading] = useState(true);

  // Track whether we already saved the current "just calculated" result
  const savedRef = useRef(false);

  // ── Load history on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetchHistory();
        if (alive) {
          setEntries(data.entries);
          setHistorySource(data.source);
        }
      } catch {
        if (alive) {
          setEntries(MOCK_HISTORY);
          setHistorySource("mock");
        }
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Persist after "=" ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.justCalculated) {
      savedRef.current = false;
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;

    const expression = state.expression.replace(/\s*=$/, "").trim();
    const result = state.display;
    if (!expression || result === "Error") return;

    const newEntry: CalcEntry = {
      id: `local-${Date.now()}`,
      expression,
      result,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [newEntry, ...prev]);

    if (historySource === "db") {
      apiSaveHistory({ expression, result }).catch(() => { /* silent */ });
    }
  }, [state.justCalculated, state.expression, state.display, historySource]);

  // ── Keyboard support ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const k = e.key;
      if (k >= "0" && k <= "9")            dispatch({ type: "DIGIT", digit: k });
      else if (k === ".")                  dispatch({ type: "DECIMAL" });
      else if (k === "+")                  dispatch({ type: "OPERATOR", operator: "+" });
      else if (k === "-")                  dispatch({ type: "OPERATOR", operator: "−" });
      else if (k === "*")                  dispatch({ type: "OPERATOR", operator: "×" });
      else if (k === "/")                  { e.preventDefault(); dispatch({ type: "OPERATOR", operator: "÷" }); }
      else if (k === "Enter" || k === "=") dispatch({ type: "EQUALS" });
      else if (k === "Escape")             dispatch({ type: "CLEAR" });
      else if (k === "%")                  dispatch({ type: "PERCENT" });
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((result: string) => {
    dispatch({ type: "INJECT", value: result });
  }, []);

  const handleClear = useCallback(() => setEntries([]), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen bg-zinc-950">
      {/* Calculator */}
      <main className="flex flex-col justify-center flex-1 items-center py-8 px-4">
        <div className="w-full max-w-[320px]">
          <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-4 text-center select-none">
            Calculator
          </p>

          <div className="bg-zinc-900 rounded-3xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
            {/* Display */}
            <Display expression={state.expression} value={state.display} />

            {/* Thin separator */}
            <div className="h-px bg-zinc-800 mx-4" />

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-3 p-4">
              {BUTTONS.map((btn) => (
                <Button
                  key={`${btn.label}${btn.wide ? "-w" : ""}`}
                  label={btn.label}
                  variant={btn.variant}
                  wide={btn.wide}
                  ariaLabel={btn.ariaLabel}
                  onClick={() => dispatch(btn.action)}
                />
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-zinc-700 mt-4 select-none">
            Keyboard ready &mdash; digits &middot; + − × ÷ &middot; Enter &middot; Esc
          </p>
        </div>
      </main>

      {/* History */}
      <HistoryPanel
        entries={entries}
        source={historySource}
        isLoading={historyLoading}
        onSelect={handleSelect}
        onClear={handleClear}
      />
    </div>
  );
}
