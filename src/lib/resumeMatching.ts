export type RowMatchStatus = "auto" | "manual" | "conflict" | "none";

export interface MatchableRow {
  rowNumber: number;
  name: string;
  officialEmail?: string | null;
  personalEmail?: string | null;
}

export interface RowResumeMatch {
  rowNumber: number;
  status: RowMatchStatus;
  /** Resolved file for this row (auto-matched, or manually assigned via manualAssignments). */
  file: File | null;
  /** Present only when status === "conflict" — every file whose filename matched this row's email. */
  conflictFiles?: File[];
}

export interface ResumeMatchResult {
  /** One entry per roster row, in row order. */
  rows: RowResumeMatch[];
  /** Files that matched no row's email at all — candidates for manual assignment. */
  unmatchedFiles: File[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/** Pulls the first email-shaped token out of a filename, e.g. "john.doe@acme.com_resume.pdf".
 *  The extension is stripped first: the regex's domain part is greedy, so on "john@acme.com.pdf"
 *  it would otherwise capture "john@acme.com.pdf" and never equal the row's "john@acme.com". */
export function extractEmailFromFilename(filename: string): string | null {
  const withoutExtension = filename.replace(/\.(pdf|docx?)$/i, "");
  const match = withoutExtension.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Every plausible address hidden in a filename, longest first. "_" and "-" are legal in an
 * email's local part, so a filename prefix like "Resume_" gets absorbed into the extracted token
 * ("resume_jane@acme.com") and is indistinguishable from part of the address without the roster.
 * Callers keep the first candidate that is a real roster email, so shorter suffixes can only ever
 * match an address that actually exists. Dots are deliberately NOT split points: "first.last" is
 * the most common address shape, so splitting there would risk matching "john.doe@x.com" to a
 * different person whose address is just "doe@x.com".
 */
export function emailCandidatesFromFilename(filename: string): string[] {
  const token = extractEmailFromFilename(filename);
  if (!token) return [];
  const at = token.indexOf("@");
  const local = token.slice(0, at);
  const domain = token.slice(at);
  const candidates = [token];
  for (let i = 0; i < local.length; i++) {
    if (local[i] === "_" || local[i] === "-") {
      const rest = local.slice(i + 1);
      if (rest) candidates.push(rest + domain);
    }
  }
  return candidates;
}

/**
 * Auto-matches resume files to roster rows by the email embedded in each filename, against that
 * row's official/personal email. `manualAssignments` (rowNumber -> File) lets the caller layer
 * admin-resolved picks on top for rows that came back "conflict" or "none" — the caller owns that
 * state since it's driven by UI interaction, not something this pure function can infer.
 */
export function matchResumesToRows(
  rows: MatchableRow[],
  files: File[],
  manualAssignments?: Map<number, File>
): ResumeMatchResult {
  const rowsByEmail = new Map<string, MatchableRow[]>();
  for (const row of rows) {
    const emails = [row.officialEmail, row.personalEmail]
      .filter((e): e is string => !!e && e.trim() !== "")
      .map((e) => e.trim().toLowerCase());
    for (const email of emails) {
      const list = rowsByEmail.get(email) ?? [];
      list.push(row);
      rowsByEmail.set(email, list);
    }
  }

  const filesByRow = new Map<number, File[]>();
  const unmatchedFiles: File[] = [];

  for (const file of files) {
    let matchedRows: MatchableRow[] | undefined;
    for (const candidate of emailCandidatesFromFilename(file.name)) {
      matchedRows = rowsByEmail.get(candidate);
      if (matchedRows && matchedRows.length > 0) break;
    }
    if (!matchedRows || matchedRows.length === 0) {
      unmatchedFiles.push(file);
      continue;
    }
    for (const row of matchedRows) {
      const list = filesByRow.get(row.rowNumber) ?? [];
      list.push(file);
      filesByRow.set(row.rowNumber, list);
    }
  }

  const resultRows: RowResumeMatch[] = rows.map((row) => {
    const candidateFiles = filesByRow.get(row.rowNumber) ?? [];
    const manual = manualAssignments?.get(row.rowNumber) ?? null;

    if (manual) {
      return { rowNumber: row.rowNumber, status: "manual", file: manual };
    }
    if (candidateFiles.length === 1) {
      return { rowNumber: row.rowNumber, status: "auto", file: candidateFiles[0] };
    }
    if (candidateFiles.length > 1) {
      return { rowNumber: row.rowNumber, status: "conflict", file: null, conflictFiles: candidateFiles };
    }
    return { rowNumber: row.rowNumber, status: "none", file: null };
  });

  // A file the admin has already assigned to a row is resolved — drop it from the pool so it can't
  // be picked for a second row (which would attach one resume to two candidates) and so the
  // "didn't auto-match" warning clears once everything has been assigned.
  const keyOf = (f: File) => `${f.name}:${f.size}`;
  const assignedKeys = new Set<string>();
  manualAssignments?.forEach((f) => assignedKeys.add(keyOf(f)));

  // Resolving a conflict by picking one file frees the row's other candidate file(s) — return them
  // to the pool so they can be assigned elsewhere instead of silently dropping out.
  const pool = [...unmatchedFiles];
  for (const row of rows) {
    const picked = manualAssignments?.get(row.rowNumber);
    const candidates = filesByRow.get(row.rowNumber) ?? [];
    if (picked && candidates.length > 1) {
      for (const c of candidates) if (keyOf(c) !== keyOf(picked)) pool.push(c);
    }
  }

  const seen = new Set<string>();
  const remainingUnmatched = pool.filter((f) => {
    const k = keyOf(f);
    if (assignedKeys.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { rows: resultRows, unmatchedFiles: remainingUnmatched };
}
