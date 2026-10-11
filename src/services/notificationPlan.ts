export interface WeeklyClock {
  /** 1 = Sunday … 7 = Saturday, matching Expo notification trigger conventions. */
  weekday: number;
  hour: number;
  minute: number;
}

function localParts(value: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
}

/**
 * Resolve a wall clock in an IANA zone. During a repeated DST hour use its first occurrence.
 * During a skipped DST hour move forward by the DST gap, retaining the selected minute.
 * This behavior is only for reminders; availability input should reject ambiguous times.
 */
export function reminderWallTimeToUTC(
  day: string,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const [year, month, date] = day.split("-").map(Number);
  const target = Date.UTC(year, month - 1, date, hour, minute);
  const candidates = new Set<number>();
  // Probe both sides of DST transitions; also handles half-hour changes such as Lord Howe.
  for (const probe of [target - 36 * 3600000, target, target + 36 * 3600000]) {
    const parts = localParts(probe, timeZone);
    const offset =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      ) - probe;
    candidates.add(target - offset);
  }
  const sorted = [...candidates].sort((a, b) => a - b);
  const exact = sorted.filter((candidate) => {
    const parts = localParts(candidate, timeZone);
    return (
      parts.year === year &&
      parts.month === month &&
      parts.day === date &&
      parts.hour === hour &&
      parts.minute === minute
    );
  });
  if (exact.length) return new Date(exact[0]);
  const forward = sorted
    .map((candidate) => {
      const parts = localParts(candidate, timeZone);
      return {
        candidate,
        wall: Date.UTC(
          parts.year,
          parts.month - 1,
          parts.day,
          parts.hour,
          parts.minute,
        ),
      };
    })
    .filter((item) => item.wall > target)
    .sort((a, b) => a.wall - b.wall);
  if (forward.length) return new Date(forward[0].candidate);
  throw new Error("REMINDER_TIME_UNRESOLVABLE");
}

/** Android does not expose a timezone on weekly triggers, so explicit zones use a rolling plan. */
export function planWeeklyDates(
  clock: WeeklyClock,
  timeZone: string,
  now = Date.now(),
  count = 12,
): Date[] {
  if (
    !Number.isInteger(clock.weekday) ||
    clock.weekday < 1 ||
    clock.weekday > 7 ||
    !Number.isInteger(clock.hour) ||
    clock.hour < 0 ||
    clock.hour > 23 ||
    !Number.isInteger(clock.minute) ||
    clock.minute < 0 ||
    clock.minute > 59 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 24 ||
    !Number.isFinite(now)
  ) {
    throw new Error("INVALID_REMINDER_CLOCK");
  }
  const today = localParts(now, timeZone);
  const localDay = new Date(
    Date.UTC(today.year, today.month - 1, today.day, 12),
  );
  const difference = (clock.weekday - 1 - localDay.getUTCDay() + 7) % 7;
  localDay.setUTCDate(localDay.getUTCDate() + difference);
  const dates: Date[] = [];
  for (let attempt = 0; dates.length < count && attempt <= count; attempt++) {
    const day = localDay.toISOString().slice(0, 10);
    const candidate = reminderWallTimeToUTC(
      day,
      clock.hour,
      clock.minute,
      timeZone,
    );
    if (candidate.getTime() > now) dates.push(candidate);
    localDay.setUTCDate(localDay.getUTCDate() + 7);
  }
  return dates;
}
