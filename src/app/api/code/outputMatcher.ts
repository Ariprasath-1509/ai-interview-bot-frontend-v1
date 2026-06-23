/**
 * Flexible stdout comparison for coding test cases.
 * Accepts numeric answers even when labels differ (e.g. "Second minium: 2" vs "Second minimum: 2").
 */

function normalize(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function primaryLine(stdout: string): string {
  const lines = normalize(stdout)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines[0] ?? "";
}

/** Number after "label: value" or the sole number on the line. */
function extractAnswerNumber(line: string): string | null {
  const colon = line.match(/:\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (colon) return colon[1];

  if (/^-?\d+(?:\.\d+)?$/.test(line.trim())) return line.trim();

  const nums = line.match(/-?\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  return nums[nums.length - 1];
}

function isMessageExpected(expected: string): boolean {
  const e = expected.trim();
  if (e.length < 8) return false;
  // Error/info messages: compare by phrase, not a single numeric answer
  if (!/\d/.test(e)) return true;
  if (/must|error|invalid|at least|cannot|can't|unable|exception/i.test(e)) return true;
  return false;
}

function messageMatches(actual: string, expected: string): boolean {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  if (a.includes(e) || e.includes(a)) return true;

  // Token overlap for long messages (tolerates minor wording differences)
  const stop = new Set(["a", "an", "the", "must", "have", "be", "to", "of", "is"]);
  const tokens = e.split(/\W+/).filter((t) => t.length > 2 && !stop.has(t));
  if (tokens.length === 0) return false;
  const hit = tokens.filter((t) => a.includes(t)).length;
  return hit >= Math.ceil(tokens.length * 0.6);
}

/**
 * Returns true if program stdout satisfies the expected output for this test case.
 */
export function outputsMatch(actualStdout: string, expected: string): boolean {
  const actual = normalize(actualStdout);
  const exp = normalize(expected);
  if (!exp) return true;
  if (actual === exp) return true;

  const actualLine = primaryLine(actual);
  const expLine = primaryLine(exp);
  if (actualLine === expLine) return true;

  if (isMessageExpected(exp)) {
    return messageMatches(actual, exp);
  }

  const actualNum = extractAnswerNumber(actualLine);
  const expNum = extractAnswerNumber(expLine);
  if (actualNum != null && expNum != null && actualNum === expNum) {
    return true;
  }

  // Expected is a bare number; actual may be labeled
  if (/^-?\d+(?:\.\d+)?$/.test(exp) && actualNum === exp) {
    return true;
  }

  // Expected has label + number; actual is bare number
  if (expNum != null && actualLine === expNum) {
    return true;
  }

  return false;
}
