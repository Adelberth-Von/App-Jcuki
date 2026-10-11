import test from "node:test";
import assert from "node:assert/strict";
import {
  wallToUTC,
  localDate,
  weekStart,
  matchingSlots,
  paginate,
  zoneAbbreviation,
  calendarICS,
  eventState,
  withoutBookedTime,
} from "../src/lib/domain.ts";

test("different local zones resolve the same instant and Berlin changes CET to CEST", () => {
  assert.equal(
    wallToUTC("2026-10-12", "20:00", "Asia/Jakarta"),
    "2026-10-12T13:00:00.000Z",
  );
  assert.equal(
    wallToUTC("2026-10-12", "22:00", "Asia/Jayapura"),
    "2026-10-12T13:00:00.000Z",
  );
  assert.equal(
    wallToUTC("2026-10-12", "15:00", "Europe/Berlin"),
    "2026-10-12T13:00:00.000Z",
  );
  assert.equal(
    wallToUTC("2026-12-12", "14:00", "Europe/Berlin"),
    "2026-12-12T13:00:00.000Z",
  );
  assert.equal(
    zoneAbbreviation("Europe/Berlin", "2026-12-12T13:00:00Z"),
    "CET",
  );
  assert.equal(
    zoneAbbreviation("Europe/Berlin", "2026-10-12T13:00:00Z"),
    "CEST",
  );
  assert.equal(
    localDate("2026-10-11T18:00:00Z", "Asia/Jayapura"),
    "2026-10-12",
  );
  assert.equal(weekStart("2026-10-11"), "2026-10-05");
});
test("invalid dates and one-hour/half-hour DST gaps and ambiguities are explicit", () => {
  assert.throws(
    () => wallToUTC("2026-02-31", "20:00", "Asia/Jakarta"),
    /INVALID_DATE/,
  );
  assert.throws(
    () => wallToUTC("2026-03-29", "02:30", "Europe/Berlin"),
    /DST_GAP/,
  );
  assert.throws(
    () => wallToUTC("2026-10-25", "02:30", "Europe/Berlin"),
    /DST_AMBIGUOUS/,
  );
  assert.throws(
    () => wallToUTC("2026-10-04", "02:15", "Australia/Lord_Howe"),
    /DST_GAP/,
  );
  assert.throws(
    () => wallToUTC("2026-04-05", "01:45", "Australia/Lord_Howe"),
    /DST_AMBIGUOUS/,
  );
});
test("matches count definite people once, merge adjacent ranges and require enough duration", () => {
  const iso = (value) => new Date(value).toISOString();
  const members = [
    { id: "a", slots: [{ start: iso(0), end: iso(6000000), status: "yes" }] },
    {
      id: "b",
      slots: [
        { start: iso(600000), end: iso(2400000), status: "yes" },
        { start: iso(2400000), end: iso(4800000), status: "yes" },
      ],
    },
    {
      id: "c",
      slots: [{ start: iso(1200000), end: iso(4200000), status: "maybe" }],
    },
  ];
  assert.deepEqual(
    matchingSlots(members, { start: 0, end: 6000000, duration: 60, min: 2 }),
    [{ start: 600000, end: 4800000, users: ["a", "b"] }],
  );
  assert.equal(
    matchingSlots([...members, members[0]], {
      start: 0,
      end: 6000000,
      duration: 30,
      min: 3,
    }).length,
    0,
  );
  assert.equal(
    matchingSlots(members, { start: 0, end: 6000000, duration: 90, min: 2 })
      .length,
    0,
  );
});
test("confirmation excludes outsiders and booked time splits availability around accepted events", () => {
  const start = Date.now() + 86400000,
    iso = (value) => new Date(value).toISOString();
  const members = [
    {
      id: "a",
      slots: [
        {
          id: "s",
          start: iso(start),
          end: iso(start + 7200000),
          status: "yes",
        },
      ],
    },
    { id: "b", slots: [] },
  ];
  const event = {
    id: "e",
    title: "Play",
    start: iso(start + 1800000),
    end: iso(start + 3600000),
    minimum: 2,
    creator: "a",
    responses: { a: "yes", outsider: "yes" },
  };
  assert.equal(eventState(event, members), "pending");
  event.responses.b = "yes";
  assert.equal(eventState(event, members), "confirmed");
  assert.deepEqual(
    withoutBookedTime(members, [event])[0].slots.map((slot) => [
      slot.start,
      slot.end,
    ]),
    [
      [iso(start), iso(start + 1800000)],
      [iso(start + 3600000), iso(start + 7200000)],
    ],
  );
});
test("page numbers clamp after filtering and ICS escapes user text with UTC instants", () => {
  assert.deepEqual(paginate([0, 1, 2, 3, 4, 5, 6, 7, 8], 3).items, [8]);
  assert.equal(paginate([], 10).page, 1);
  const ics = calendarICS({
    title: "Game, night;\nFriends",
    start: "2026-10-12T13:00:00Z",
    end: "2026-10-12T14:00:00Z",
  });
  assert.match(ics, /DTSTART:20261012T130000Z/);
  assert.match(ics, /SUMMARY:Game\\, night\\;\\nFriends/);
});
