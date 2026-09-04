/**
 * All backend timestamps are stored/serialized as UTC instants, but the business operates in IST —
 * every Spring Boot service pins its JVM default zone to Asia/Kolkata. The Next.js server has no such
 * override (the container defaults to UTC), so any `toLocaleString`/`toLocaleDateString` call made
 * without an explicit `timeZone` renders in the *server's* zone on server-rendered pages, and in the
 * *viewer's device* zone on client-rendered ones — neither of which reliably matches IST. Pinning the
 * zone here keeps every date/time display consistent with what the backend means by "today"/"now",
 * regardless of where the formatting runs.
 */
const BUSINESS_TIMEZONE = "Asia/Kolkata";

function toValidDate(iso: string | number | Date | null | undefined): Date | null {
  if (iso === null || iso === undefined || iso === "") return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** e.g. "Aug 25, 2026" */
export function formatDate(
  iso: string | number | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  fallback = "—"
): string {
  const d = toValidDate(iso);
  return d ? d.toLocaleDateString("en-US", { ...opts, timeZone: BUSINESS_TIMEZONE }) : fallback;
}

/** e.g. "Aug 25, 2026, 3:45 PM" */
export function formatDateTime(
  iso: string | number | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
  fallback = "—"
): string {
  const d = toValidDate(iso);
  return d ? d.toLocaleString("en-US", { ...opts, timeZone: BUSINESS_TIMEZONE }) : fallback;
}

/** e.g. "3:45 PM" */
export function formatTime(
  iso: string | number | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
  fallback = "—"
): string {
  const d = toValidDate(iso);
  return d ? d.toLocaleTimeString("en-US", { ...opts, timeZone: BUSINESS_TIMEZONE }) : fallback;
}
