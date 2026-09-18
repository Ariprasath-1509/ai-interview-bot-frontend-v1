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

/** Pulls the first email-shaped token out of a filename, e.g. "john.doe@acme.com_resume.pdf". */
export function extractEmailFromFilename(filename: string): string | null {
  const match = filename.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : null;
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
    const email = extractEmailFromFilename(file.name);
    const matchedRows = email ? rowsByEmail.get(email) : undefined;
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

  return { rows: resultRows, unmatchedFiles };
}
