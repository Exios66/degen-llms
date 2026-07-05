/** Las Vegas local time — Pacific Time (America/Los_Angeles), two hours behind Central. */
export const VEGAS_TIMEZONE = "America/Los_Angeles";

const VEGAS_LOCALE = "en-US";

function parseDate(isoOrDate) {
  if (isoOrDate instanceof Date) return isoOrDate;
  const d = new Date(isoOrDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Full Las Vegas date/time in 24-hour format with PT suffix. */
export function formatVegasDateTime(isoOrDate) {
  const d = parseDate(isoOrDate);
  if (!d) return "unknown";
  const formatted = d.toLocaleString(VEGAS_LOCALE, {
    timeZone: VEGAS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${formatted} PT`;
}

/** Compact Las Vegas date/time for save slots and ledgers. */
export function formatVegasDateTimeShort(isoOrDate) {
  const d = parseDate(isoOrDate);
  if (!d) return "unknown";
  const formatted = d.toLocaleString(VEGAS_LOCALE, {
    timeZone: VEGAS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatted} PT`;
}

/** Las Vegas wall-clock time in 24-hour format (HH:MM:SS). */
export function formatVegasTime(isoOrDate) {
  const d = parseDate(isoOrDate ?? new Date());
  if (!d) return "unknown";
  return d.toLocaleTimeString(VEGAS_LOCALE, {
    timeZone: VEGAS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Current Las Vegas wall-clock time. */
export function formatVegasNow() {
  return formatVegasTime(new Date());
}

/** Label for live clock displays in the casino UI. */
export function formatVegasClockLabel(isoOrDate) {
  return `Las Vegas: ${formatVegasTime(isoOrDate ?? new Date())} PT`;
}

/** Guest book / conversation timestamps. */
export function formatVegasSignedAt(isoOrDate) {
  const d = parseDate(isoOrDate);
  if (!d) return String(isoOrDate ?? "unknown");
  const formatted = d.toLocaleString(VEGAS_LOCALE, {
    timeZone: VEGAS_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatted} PT`;
}
