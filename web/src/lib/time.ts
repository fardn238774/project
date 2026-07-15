/**
 * Auction sessions happen in Japan but are read in Bangladesh, so every time
 * is rendered in both zones. Explicit IANA zones keep this deterministic on
 * the server and the client (no reliance on the host's local zone).
 */
export const JST = "Asia/Tokyo"; // UTC+9
export const BST = "Asia/Dhaka"; // UTC+6, Bangladesh Standard Time

const hhmm = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const timeInJst = (d: Date) => hhmm(JST).format(d);
export const timeInBst = (d: Date) => hhmm(BST).format(d);

/** Calendar day number in a given zone, for "is this the same day" maths. */
function dayIndex(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return Date.UTC(
    Number(parts.slice(0, 4)),
    Number(parts.slice(5, 7)) - 1,
    Number(parts.slice(8, 10)),
  );
}

/**
 * "Today" / "Tomorrow" / "Thu" — relative to the buyer's day in Bangladesh,
 * matching the prototype's session labels.
 */
export function sessionDayLabel(startsAt: Date, now: Date = new Date()) {
  const diffDays = (dayIndex(startsAt, BST) - dayIndex(now, BST)) / 86_400_000;

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", { timeZone: BST, weekday: "short" }).format(startsAt);
}

/**
 * "26 Jul" in Bangladesh time — for dates far enough out that a weekday name
 * would be ambiguous (container departures, dispute windows).
 */
export function shortDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BST,
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Whole days from now until `d`, counted in Bangladesh calendar days. */
export function daysUntil(d: Date, now: Date = new Date()) {
  return Math.round((dayIndex(d, BST) - dayIndex(now, BST)) / 86_400_000);
}

/** "2:34" / "1:02:34" — the prototype's countdown format. */
export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
