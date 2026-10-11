import type {
  Availability,
  DayOff,
  Event,
  Language,
  Match,
  Member,
} from "./types";

export const ZONES: [string, string][] = [
  ["Asia/Jakarta", "Jakarta · WIB"],
  ["Asia/Makassar", "Makassar · WITA"],
  ["Asia/Jayapura", "Jayapura · WIT"],
  ["Europe/Berlin", "Berlin · CET / CEST"],
  ["Asia/Bangkok", "Bangkok"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
  ["Europe/London", "London"],
  ["America/New_York", "New York"],
  ["America/Los_Angeles", "Los Angeles"],
  ["Pacific/Auckland", "Auckland"],
];
const locales: Record<Language, string> = { id: "id-ID", en: "en-GB" };
const pad = (value: number) => String(value).padStart(2, "0");
export function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export function deviceZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone && validZone(zone) ? zone : "UTC";
}
export function parts(
  instant: string | number | Date,
  zone: string,
): Record<string, number> {
  const output = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  return Object.fromEntries(
    output
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}
export function localDate(
  instant: string | number | Date,
  zone: string,
): string {
  const p = parts(instant, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
function validDay(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("INVALID_DATE");
  const result = new Date(day + "T12:00:00.000Z");
  if (
    !Number.isFinite(result.getTime()) ||
    result.toISOString().slice(0, 10) !== day
  )
    throw new Error("INVALID_DATE");
  return result;
}
export function addDays(day: string, count: number): string {
  const value = validDay(day);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
export function weekStart(day: string): string {
  return addDays(day, -((validDay(day).getUTCDay() + 6) % 7));
}
export function confirmLocalDay(
  date: string,
  zone: string,
  now = Date.now(),
): DayOff {
  validDay(date);
  if (!validZone(zone)) throw new Error("INVALID_TIME");
  if (date < localDate(now, zone)) throw new Error("pastTime");
  return { date, zone, confirmedAt: new Date(now).toISOString() };
}
export function playingSlots(
  slots: Availability[],
  day: DayOff,
): Availability[] {
  return slots
    .filter(
      (s) => s.status === "yes" && localDate(s.start, day.zone) === day.date,
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
export function removeConfirmedDay(member: Member, date: string): Member {
  const day = member.daysOff?.find((d) => d.date === date);
  return {
    ...member,
    daysOff: (member.daysOff || []).filter((d) => d.date !== date),
    slots: day
      ? member.slots.filter((s) => localDate(s.start, day.zone) !== date)
      : member.slots,
  };
}
// IANA zones automatically account for seasonal clock changes. Explicitly reject skipped/repeated local hours.
export function wallToUTC(day: string, time: string, zone: string): string {
  validDay(day);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !validZone(zone))
    throw new Error("INVALID_TIME");
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, date, hour, minute);
  const offsets = new Set<number>();
  // Sampling on both sides of a possible transition also covers 30 minute DST transitions.
  for (let delta = -36; delta <= 36; delta += 6) {
    const sample = target + delta * 3600000;
    const p = parts(sample, zone);
    offsets.add(
      Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sample,
    );
  }
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter((instant) => {
      const p = parts(instant, zone);
      return (
        p.year === year &&
        p.month === month &&
        p.day === date &&
        p.hour === hour &&
        p.minute === minute
      );
    });
  if (!candidates.length) throw new Error("DST_GAP");
  if (candidates.length > 1) throw new Error("DST_AMBIGUOUS");
  return new Date(candidates[0]).toISOString();
}
export function formatTime(
  instant: string | number,
  zone: string,
  language: Language = "id",
  hour24 = true,
): string {
  return new Intl.DateTimeFormat(locales[language], {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !hour24,
  }).format(new Date(instant));
}
export function formatDate(
  instant: string | number,
  zone: string,
  language: Language = "id",
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locales[language], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...options,
    timeZone: zone,
  }).format(new Date(instant));
}
export function zoneAbbreviation(
  zone: string,
  instant: string | number = Date.now(),
): string {
  const localNames: Record<string, string> = {
    "Asia/Jakarta": "WIB",
    "Asia/Makassar": "WITA",
    "Asia/Jayapura": "WIT",
  };
  if (localNames[zone]) return localNames[zone];
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
      .formatToParts(new Date(instant))
      .find((p) => p.type === "timeZoneName")?.value || zone;
  if (zone === "Europe/Berlin")
    return name === "GMT+2" ? "CEST" : name === "GMT+1" ? "CET" : name;
  return name;
}
export function matchingSlots(
  members: Pick<Member, "id" | "slots">[],
  {
    start,
    end,
    duration = 60,
    min = members.length,
  }: { start: number; end: number; duration?: number; min?: number },
): Match[] {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    duration <= 0 ||
    min < 1
  )
    return [];
  const uniqueMembers = [
    ...new Map(members.map((member) => [member.id, member])).values(),
  ];
  const points = new Set<number>();
  for (const member of uniqueMembers)
    for (const slot of member.slots || []) {
      const a = Date.parse(slot.start),
        b = Date.parse(slot.end);
      if (slot.status === "yes" && b > start && a < end && b > a) {
        points.add(Math.max(start, a));
        points.add(Math.min(end, b));
      }
    }
  const times = [...points].sort((a, b) => a - b);
  const output: Match[] = [];
  for (let index = 0; index < times.length - 1; index++) {
    const a = times[index],
      b = times[index + 1];
    const users = uniqueMembers
      .filter((member) =>
        (member.slots || []).some(
          (slot) =>
            slot.status === "yes" &&
            Date.parse(slot.start) <= a &&
            Date.parse(slot.end) >= b,
        ),
      )
      .map((member) => member.id)
      .sort();
    if (users.length < min) continue;
    const previous = output[output.length - 1];
    if (
      previous &&
      previous.end === a &&
      previous.users.join("|") === users.join("|")
    )
      previous.end = b;
    else output.push({ start: a, end: b, users });
  }
  return output
    .filter((match) => match.end - match.start >= duration * 60000)
    .sort((a, b) => b.users.length - a.users.length || a.start - b.start);
}
export function paginate<T>(
  items: T[],
  page: number,
  size = 4,
): { items: T[]; page: number; pages: number; total: number } {
  const safeSize = Math.max(1, Math.floor(size) || 4),
    pages = Math.max(1, Math.ceil(items.length / safeSize));
  const current = Math.max(1, Math.min(Math.floor(page) || 1, pages));
  return {
    items: items.slice((current - 1) * safeSize, current * safeSize),
    page: current,
    pages,
    total: items.length,
  };
}
export function eventState(
  event: Event,
  members: Pick<Member, "id">[],
  now = Date.now(),
): "cancelled" | "past" | "confirmed" | "pending" {
  if (event.cancelled) return "cancelled";
  if (Date.parse(event.end) < now) return "past";
  const accepted = members.filter(
    (member) => event.responses[member.id] === "yes",
  ).length;
  return accepted >= (event.minimum || members.length)
    ? "confirmed"
    : "pending";
}
export function withoutBookedTime<T extends Pick<Member, "id" | "slots">>(
  members: T[],
  events: Event[],
): T[] {
  return members.map((member) => ({
    ...member,
    slots: (member.slots || []).flatMap((slot) => {
      let pieces: Availability[] = [slot];
      for (const event of events) {
        if (
          eventState(event, members) !== "confirmed" ||
          event.responses[member.id] !== "yes"
        )
          continue;
        pieces = pieces.flatMap((piece) => {
          const a = Date.parse(piece.start),
            b = Date.parse(piece.end),
            x = Date.parse(event.start),
            y = Date.parse(event.end);
          if (y <= a || x >= b) return [piece];
          return [
            ...(x > a ? [{ ...piece, end: new Date(x).toISOString() }] : []),
            ...(y < b ? [{ ...piece, start: new Date(y).toISOString() }] : []),
          ];
        });
      }
      return pieces;
    }),
  }));
}
export function availabilityForDay(
  slots: Availability[],
  day: string,
  zone: string,
): Availability[] {
  const start = Date.parse(wallToUTC(day, "00:00", zone)),
    end = Date.parse(wallToUTC(addDays(day, 1), "00:00", zone));
  return slots
    .filter(
      (slot) => Date.parse(slot.end) > start && Date.parse(slot.start) < end,
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
export function calendarICS({
  title,
  start,
  end,
  description = "",
  uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@jcuki`,
}: {
  title: string;
  start: string;
  end: string;
  description?: string;
  uid?: string;
}): string {
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const date = (value: string | number) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  // Fold long ASCII/Unicode lines conservatively by code point, avoiding invalid UTF-16 splits.
  const fold = (line: string) => {
    let output = "",
      count = 0;
    for (const char of line) {
      const code = char.codePointAt(0)!;
      const bytes =
        code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
      if (count + bytes > 73) {
        output += "\r\n ";
        count = 1;
      }
      output += char;
      count += bytes;
    }
    return output;
  };
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Terrence//JCuki//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${escape(uid)}`,
      `DTSTAMP:${date(Date.now())}`,
      `DTSTART:${date(start)}`,
      `DTEND:${date(end)}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(title)}`,
      "TRIGGER:-PT15M",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
