import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmLocalDay,
  playingSlots,
  removeConfirmedDay,
  wallToUTC,
} from "../src/lib/domain.ts";

test("a confirmed day off has no required playing hours, including a 25-hour Berlin DST day", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const day = confirmLocalDay("2026-10-25", "Europe/Berlin", now);
  assert.equal(day.date, "2026-10-25");
  assert.equal(day.confirmedAt, "2026-10-11T12:00:00.000Z");
  assert.deepEqual(playingSlots([], day), []);
  assert.throws(
    () => confirmLocalDay("2026-02-30", "Asia/Jakarta", now),
    /INVALID_DATE/,
  );
  assert.throws(
    () => confirmLocalDay("2026-10-10", "Asia/Jakarta", now),
    /pastTime/,
  );
});

test("playing hours belong to the explicitly confirmed local date, overnight removal is scoped to that date", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const day = confirmLocalDay("2026-10-12", "Asia/Jayapura", now);
  const slot = {
    id: "night",
    start: wallToUTC(day.date, "23:00", day.zone),
    end: wallToUTC("2026-10-13", "01:00", day.zone),
    status: "yes",
  };
  const other = {
    ...slot,
    id: "other",
    start: wallToUTC("2026-10-13", "23:00", day.zone),
    end: wallToUTC("2026-10-14", "01:00", day.zone),
  };
  assert.deepEqual(playingSlots([slot, other], day), [slot]);
  const member = {
    id: "a",
    nickname: "A",
    zone: "Europe/Berlin",
    slots: [slot, other],
    daysOff: [day],
  };
  assert.equal(removeConfirmedDay(member, day.date).slots[0].id, "other");
  assert.deepEqual(removeConfirmedDay(member, day.date).daysOff, []);
  assert.deepEqual({ ...member, slots: [] }.daysOff, [day]);
  assert.deepEqual(
    removeConfirmedDay({ ...member, daysOff: undefined }, day.date).slots,
    [slot, other],
  );
});
