export interface GeneratedTestCase {
  id: string;
  name: string;
  input: string;
  expected: string;
}

type RawTestCase = { name?: string; input?: string; expected?: string };

/** Extract a JSON array from LLM output (strips fences, finds first `[...]`). */
export function parseTestCasesFromLlm(raw: string): RawTestCase[] | null {
  if (!raw?.trim()) return null;
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Trailing commas / minor issues
    try {
      const repaired = text.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
      const parsed = JSON.parse(repaired);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

/** Prefer bare answer values; strip "Label: 42" down to "42" for numeric problems. */
function sanitizeExpected(expected: string): string {
  const e = expected.trim();
  const labeled = e.match(/^[^:]+:\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (labeled) return labeled[1];
  return e;
}

function normalizeCases(raw: RawTestCase[]): GeneratedTestCase[] {
  return raw
    .filter((tc) => (tc.input ?? "").trim() || (tc.expected ?? "").trim())
    .slice(0, 6)
    .map((tc, i) => ({
      id: String(i + 1),
      name: (tc.name || `Case ${i + 1}`).trim().slice(0, 64),
      input: String(tc.input ?? "").replace(/\\n/g, "\n"),
      expected: sanitizeExpected(String(tc.expected ?? "")),
    }));
}

/** Classic bad LLM copy: factorial demo values regardless of the question. */
export function looksLikeFactorialTemplate(cases: GeneratedTestCase[]): boolean {
  if (cases.length < 2) return false;
  const hasFactorialPair = cases.some(
    (tc) =>
      tc.input.trim() === "5" && (tc.expected === "120" || tc.expected === "120\n"),
  );
  const hasZeroOne = cases.some(
    (tc) => tc.input.trim() === "0" && tc.expected.trim() === "1",
  );
  return hasFactorialPair && hasZeroOne;
}

export function questionMentionsFactorial(question: string): boolean {
  return /\bfactorial\b/i.test(question);
}

export function questionMentionsSecondMin(question: string): boolean {
  return /\b(second\s+(smallest|minimum|min)|2nd\s+(smallest|minimum)|second\s+lowest)\b/i.test(
    question,
  );
}

export function validateTestCasesForQuestion(
  question: string,
  cases: GeneratedTestCase[],
): { ok: boolean; reason?: string } {
  if (cases.length < 2) {
    return { ok: false, reason: "too_few_cases" };
  }

  const emptyExpected = cases.filter((tc) => !tc.expected.trim()).length;
  if (emptyExpected > cases.length / 2) {
    return { ok: false, reason: "missing_expected" };
  }

  if (looksLikeFactorialTemplate(cases) && !questionMentionsFactorial(question)) {
    return { ok: false, reason: "factorial_template_mismatch" };
  }

  if (questionMentionsSecondMin(question)) {
    const factorialOutputs = cases.some((tc) =>
      ["120", "1", "720"].includes(tc.expected.trim()),
    );
    if (factorialOutputs) {
      return { ok: false, reason: "second_min_with_factorial_outputs" };
    }
  }

  return { ok: true };
}

/** Deterministic cases when the LLM returns garbage or wrong problem type. */
export function buildHeuristicTestCases(question: string): GeneratedTestCase[] | null {
  const q = question.toLowerCase();

  if (questionMentionsSecondMin(question) || /\bstreams?\b.*\b(min|minimum|smallest)\b/i.test(question)) {
    return [
      { id: "1", name: "Happy path", input: "3\n5\n8\n1\n2\n7\n", expected: "2" },
      { id: "2", name: "Duplicates", input: "4\n4\n4\n4\n4\n", expected: "4" },
      { id: "3", name: "Negative numbers", input: "-5\n-10\n-3\n-8\n-2\n", expected: "-8" },
      { id: "4", name: "Single element", input: "5\n", expected: "at least two elements" },
      { id: "5", name: "Mixed numbers", input: "10\n-5\n3\n7\n-2\n9\n", expected: "-2" },
    ];
  }

  if (questionMentionsFactorial(q) || /\bn!\b/.test(q)) {
    return [
      { id: "1", name: "n = 5", input: "5\n", expected: "120" },
      { id: "2", name: "n = 0", input: "0\n", expected: "1" },
      { id: "3", name: "n = 1", input: "1\n", expected: "1" },
      { id: "4", name: "n = 3", input: "3\n", expected: "6" },
    ];
  }

  if (/\bfibonacci\b/i.test(q)) {
    return [
      { id: "1", name: "n = 0", input: "0\n", expected: "0" },
      { id: "2", name: "n = 1", input: "1\n", expected: "1" },
      { id: "3", name: "n = 6", input: "6\n", expected: "8" },
      { id: "4", name: "n = 10", input: "10\n", expected: "55" },
    ];
  }

  if (
    /\breverse\b.*\bwords?\b/i.test(q) ||
    /\bwords?\b.*\breverse\b/i.test(q) ||
    (/\breverse\b/i.test(q) && /\bsentence\b/i.test(q))
  ) {
    return [
      { id: "1", name: "Simple sentence", input: "hi am niranjan from ty\n", expected: "ih ma niranjan morf yt" },
      { id: "2", name: "Single word", input: "hello\n", expected: "olleh" },
      { id: "3", name: "Two words", input: "hello world\n", expected: "olleh dlrow" },
      { id: "4", name: "Palindrome word", input: "racecar\n", expected: "racecar" },
    ];
  }

  if (/\breverse\b.*\bstring\b/i.test(q) || /\bstring\b.*\breverse\b/i.test(q)) {
    return [
      { id: "1", name: "Basic word", input: "hello\n", expected: "olleh" },
      { id: "2", name: "Palindrome", input: "aba\n", expected: "aba" },
      { id: "3", name: "Single char", input: "a\n", expected: "a" },
    ];
  }

  if (/\bpalindrome\b/i.test(q)) {
    return [
      { id: "1", name: "Yes", input: "racecar\n", expected: "true" },
      { id: "2", name: "No", input: "hello\n", expected: "false" },
      { id: "3", name: "Single char", input: "a\n", expected: "true" },
    ];
  }

  if (/\b(sum|add)\b.*\b(array|list|numbers)\b/i.test(q) || /\bsum of\b/i.test(q)) {
    return [
      { id: "1", name: "Mixed signs", input: "1 -2 3 4\n", expected: "6" },
      { id: "2", name: "All positive", input: "10 20 30\n", expected: "60" },
      { id: "3", name: "Single value", input: "7\n", expected: "7" },
    ];
  }

  if (/\b(maximum|max)\b.*\b(array|list)\b/i.test(q) || /\blargest\b/i.test(q)) {
    return [
      { id: "1", name: "Unsorted", input: "3 1 4 1 5\n", expected: "5" },
      { id: "2", name: "Negatives", input: "-5 -2 -8\n", expected: "-2" },
      { id: "3", name: "One element", input: "42\n", expected: "42" },
    ];
  }

  if (/\b(minimum|min)\b.*\b(array|list)\b/i.test(q) && !questionMentionsSecondMin(question)) {
    return [
      { id: "1", name: "Unsorted", input: "3 1 4 1 5\n", expected: "1" },
      { id: "2", name: "Negatives", input: "-5 -2 -8\n", expected: "-8" },
      { id: "3", name: "One element", input: "42\n", expected: "42" },
    ];
  }

  if (/\bprime\b/i.test(q)) {
    return [
      { id: "1", name: "Prime", input: "7\n", expected: "true" },
      { id: "2", name: "Not prime", input: "4\n", expected: "false" },
      { id: "3", name: "Edge 2", input: "2\n", expected: "true" },
    ];
  }

  if (/\beven\b|\bodd\b/i.test(q)) {
    return [
      { id: "1", name: "Even", input: "4\n", expected: "true" },
      { id: "2", name: "Odd", input: "7\n", expected: "false" },
      { id: "3", name: "Zero", input: "0\n", expected: "true" },
    ];
  }

  if (/\bstream\b/i.test(q) && (/\bjava\b/i.test(q) || /\bcollect\b/i.test(q))) {
    return [
      { id: "1", name: "Simple sentence", input: "hi am niranjan from ty\n", expected: "ih ma niranjan morf yt" },
      { id: "2", name: "Single word", input: "hello\n", expected: "olleh" },
      { id: "3", name: "Numbers as words", input: "one two three\n", expected: "eno owt eerht" },
    ];
  }

  return null;
}

export function buildLlmPrompt(question: string, language: string): { system: string; user: string } {
  const system = `You generate stdin/stdout test cases for coding interview programs.
Rules:
- Test cases MUST match the EXACT problem in the question. Never reuse examples from other problems (e.g. do NOT output factorial 5->120 unless the question asks for factorial).
- Programs read from stdin and print the answer to stdout (one line unless specified).
- Use realistic inputs for the stated problem only.
- "expected" must be ONLY the answer value (e.g. "2" or "-8"), NOT a sentence like "Second minimum: 2". Use a short error phrase only for invalid-input cases.
- Return ONLY a JSON array, no markdown, no explanation.
Schema: [{"name":"short label","input":"stdin text (use \\n for newlines)","expected":"answer only"}]`;

  const user = `Language: ${language}

Problem (generate 4-5 test cases ONLY for this problem):
${question}

Requirements:
1. Happy path with a clear numeric/string answer
2. At least one edge case relevant to THIS problem (empty list, duplicates, negatives, single element — only if applicable)
3. "input" is exactly what is typed into stdin (one value per line when reading a list)
4. "expected" is ONLY the numeric/string answer (e.g. "2"), never a prefixed label like "Second minimum: 2"
5. Do NOT copy generic factorial examples unless the problem explicitly asks for factorial

Return the JSON array now.`;

  return { system, user };
}

export async function fetchLlmTestCases(
  aiChatUrl: string,
  question: string,
  language: string,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Promise<GeneratedTestCase[] | null> {
  const { system, user } = buildLlmPrompt(question, language);

  const aiRes = await fetch(aiChatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ system, user }),
  });

  if (!aiRes.ok) return null;

  const aiData = (await aiRes.json()) as { response?: string; message?: string };
  const raw = aiData.response || aiData.message || "";
  const parsed = parseTestCasesFromLlm(raw);
  if (!parsed?.length) return null;

  return normalizeCases(parsed);
}

export function resolveTestCases(question: string, language: string, llmCases: GeneratedTestCase[] | null): {
  testCases: GeneratedTestCase[];
  source: "llm" | "heuristic" | "empty";
} {
  if (llmCases?.length) {
    const validation = validateTestCasesForQuestion(question, llmCases);
    if (validation.ok) {
      return { testCases: llmCases, source: "llm" };
    }
  }

  const heuristic = buildHeuristicTestCases(question);
  if (heuristic?.length) {
    return { testCases: heuristic, source: "heuristic" };
  }

  return { testCases: [], source: "empty" };
}
