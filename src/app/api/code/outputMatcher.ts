/**
 * Flexible stdout comparison for coding test cases.
 *
 * Matching pipeline (first match wins):
 *  1. Exact string equality
 *  2. Boolean normalisation  (True/False/1/0/yes/no)
 *  3. Float near-equality    (relative tolerance 1e-6)
 *  4. Bracket-stripped list  ("[1,2,3]" == "1 2 3" == "1\n2\n3")
 *  5. Primary-line exact match
 *  6. Whitespace-collapsed match
 *  7. Case-insensitive match
 *  8. Numeric label extraction ("Answer: 42" == "42")
 *  9. Message fuzzy match     (for error / invalid-input expectations)
 */

// ── Normalisation helpers ─────────────────────────────────────────────────

function norm(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function primaryLine(s: string): string {
  return norm(s)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)[0] ?? "";
}

function collapseWs(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// ── Boolean normalisation ─────────────────────────────────────────────────

type BoolVal = "true" | "false";

function normBool(s: string): BoolVal | null {
  switch (s.trim().toLowerCase()) {
    case "true":  case "yes": case "1": case "y": return "true";
    case "false": case "no":  case "0": case "n": return "false";
    default: return null;
  }
}

// ── Float near-equality ───────────────────────────────────────────────────

function parseNum(s: string): number | null {
  const n = Number(s.trim());
  return isFinite(n) ? n : null;
}

function floatNear(a: string, b: string, tol = 1e-6): boolean {
  const fa = parseNum(a);
  const fb = parseNum(b);
  if (fa === null || fb === null) return false;
  if (fa === fb) return true;
  const denom = Math.max(Math.abs(fa), Math.abs(fb), 1);
  return Math.abs(fa - fb) / denom <= tol;
}

// ── List / array normalisation ────────────────────────────────────────────
// Handles: "[1, 2, 3]"  "1 2 3"  "1\n2\n3"  "(1, 2, 3)"

function toTokens(s: string): string[] | null {
  const stripped = s.trim().replace(/^[\[(]|[\])]$/g, "").trim();
  const parts = stripped
    .split(/[\s,;|]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

function listsMatch(actual: string, expected: string): boolean {
  const at = toTokens(actual);
  const et = toTokens(expected);
  if (!at || !et || at.length !== et.length) return false;
  return at.every((v, i) => {
    const e = et[i];
    if (v === e) return true;
    if (floatNear(v, e)) return true;
    if (normBool(v) && normBool(v) === normBool(e)) return true;
    return false;
  });
}

// ── Number-after-label extraction ─────────────────────────────────────────
// "Second minimum: 2" → "2",  "42" → "42"

function extractNum(line: string): string | null {
  const colonMatch = line.match(/:\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (colonMatch) return colonMatch[1];
  if (/^-?\d+(?:\.\d+)?$/.test(line.trim())) return line.trim();
  const nums = line.match(/-?\d+(?:\.\d+)?/g);
  return nums?.length ? nums[nums.length - 1] : null;
}

// ── Message / phrase fuzzy match ──────────────────────────────────────────

function isMessage(expected: string): boolean {
  const e = expected.trim();
  if (e.length < 8) return false;
  if (!/\d/.test(e)) return true;
  if (/must|error|invalid|at least|cannot|can't|unable|exception/i.test(e)) return true;
  return false;
}

function messageMatches(actual: string, expected: string): boolean {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  if (a.includes(e) || e.includes(a)) return true;
  const stop = new Set(["a", "an", "the", "must", "have", "be", "to", "of", "is"]);
  const tokens = e.split(/\W+/).filter((t) => t.length > 2 && !stop.has(t));
  if (!tokens.length) return false;
  return tokens.filter((t) => a.includes(t)).length >= Math.ceil(tokens.length * 0.6);
}

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Returns true if program stdout satisfies the expected output for this test case.
 */
export function outputsMatch(actualStdout: string, expected: string): boolean {
  const actual = norm(actualStdout);
  const exp    = norm(expected);

  if (!exp) return true;

  // 1. Exact
  if (actual === exp) return true;

  const aLine = primaryLine(actual);
  const eLine = primaryLine(exp);

  // 2. Boolean normalisation
  const aBool = normBool(aLine);
  const eBool = normBool(eLine);
  if (aBool !== null && eBool !== null && aBool === eBool) return true;

  // 3. Float near-equality (single value)
  if (floatNear(aLine, eLine)) return true;

  // 4. List / array match
  if (listsMatch(actual, exp)) return true;
  if (listsMatch(aLine, eLine)) return true;

  // 5. Primary-line exact
  if (aLine === eLine) return true;

  // 6. Whitespace-collapsed
  if (collapseWs(actual) === collapseWs(exp)) return true;
  if (collapseWs(aLine) === collapseWs(eLine)) return true;

  // 7. Case-insensitive (only for short non-numeric values to avoid false positives)
  if (eLine.length <= 64 && !/\d/.test(eLine)) {
    if (aLine.toLowerCase() === eLine.toLowerCase()) return true;
  }

  // 8. Numeric label extraction
  const aNum = extractNum(aLine);
  const eNum = extractNum(eLine);
  if (aNum !== null && eNum !== null) {
    if (aNum === eNum) return true;
    if (floatNear(aNum, eNum)) return true;
  }
  // bare number vs labelled
  if (/^-?\d+(?:\.\d+)?$/.test(exp) && aNum === exp) return true;
  if (eNum !== null && aLine === eNum) return true;

  // 9. Message fuzzy match
  if (isMessage(exp)) return messageMatches(actual, exp);

  return false;
}

// ── Mismatch explanation (heuristic, no AI needed) ────────────────────────

/**
 * Given actual stdout and expected output that did NOT match,
 * returns a one-sentence hint explaining the likely cause.
 * Returns undefined when no specific pattern is recognisable.
 */
export function explainMismatch(actualStdout: string, expected: string): string | undefined {
  const actual = norm(actualStdout);
  const exp    = norm(expected);
  const aLine  = primaryLine(actual);
  const eLine  = primaryLine(exp);

  // No output at all
  if (!actual || actual === "(no output)") {
    return "Your program produced no output — check that you have a print statement.";
  }

  // Label prefix: "Answer: 42" when expected is "42"
  if (/^[A-Za-z ]+:\s*\S/.test(aLine) && !/[A-Za-z ]+:/.test(eLine)) {
    return "Your output includes a label (e.g. 'Answer: 42'). Print just the value with no prefix.";
  }

  // Boolean case mismatch: True vs true
  const aBool = normBool(aLine);
  const eBool = normBool(eLine);
  if (aBool !== null && eBool !== null && aBool === eBool) {
    return `Check boolean casing — expected "${eLine}" but got "${aLine}". Use lowercase true/false.`;
  }

  // Bracket wrapping: "[2]" or "(2)" when expected is "2"
  if (/^[\[(].+[\])]$/.test(aLine) && !/^[\[(]/.test(eLine)) {
    return "Don't wrap your output in brackets — print just the plain value.";
  }

  // Float close but not matching
  const aFloat = parseNum(aLine);
  const eFloat = parseNum(eLine);
  if (aFloat !== null && eFloat !== null && Math.abs(aFloat - eFloat) < 1) {
    return "Your answer is numerically close — check rounding or precision (e.g. use integer division if the answer should be whole).";
  }

  // Extra lines
  const aLines = actual.split("\n").filter((l) => l.trim());
  const eLines = exp.split("\n").filter((l) => l.trim());
  if (aLines.length > eLines.length) {
    return `Your output has ${aLines.length} line(s) but only ${eLines.length} line(s) are expected — print only the final answer.`;
  }
  if (aLines.length < eLines.length) {
    return `Your output has ${aLines.length} line(s) but ${eLines.length} were expected — make sure you print all required values.`;
  }

  // Whitespace-only difference
  if (actual.replace(/\s+/g, "") === exp.replace(/\s+/g, "")) {
    return "Your values are correct but the spacing differs — check for extra spaces or newlines.";
  }

  // Case-only difference
  if (actual.toLowerCase() === exp.toLowerCase()) {
    return `Check letter casing — your output "${actual.slice(0, 40)}" doesn't match the expected "${exp.slice(0, 40)}".`;
  }

  // Numeric label on expected but bare actual
  const aNum = extractNum(aLine);
  const eNum = extractNum(eLine);
  if (aNum !== null && eNum !== null && aNum !== eNum) {
    return `Your computed value (${aNum}) doesn't match the expected value (${eNum}) — check your algorithm logic.`;
  }

  return undefined;
}
