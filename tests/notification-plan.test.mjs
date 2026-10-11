import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  planWeeklyDates,
  reminderWallTimeToUTC,
} from "../src/services/notificationPlan.ts";

test("weekly reminder uses the selected IANA zone, not a fixed device offset", () => {
  const now = Date.parse("2026-10-11T11:30:00Z");
  const dates = planWeeklyDates(
    { weekday: 1, hour: 19, minute: 0 },
    "Asia/Jakarta",
    now,
    2,
  );
  assert.deepEqual(
    dates.map((date) => date.toISOString()),
    ["2026-10-11T12:00:00.000Z", "2026-10-18T12:00:00.000Z"],
  );
});

test("passed reminder on the same weekday rolls to the next week", () => {
  const dates = planWeeklyDates(
    { weekday: 1, hour: 19, minute: 0 },
    "Asia/Jayapura",
    Date.parse("2026-10-11T11:00:00Z"),
    1,
  );
  assert.equal(dates[0].toISOString(), "2026-10-18T10:00:00.000Z");
});

test("Berlin weekly reminders keep their local hour across CET/CEST", () => {
  const dates = planWeeklyDates(
    { weekday: 1, hour: 19, minute: 0 },
    "Europe/Berlin",
    Date.parse("2026-10-17T00:00:00Z"),
    2,
  );
  assert.deepEqual(
    dates.map((date) => date.toISOString()),
    ["2026-10-18T17:00:00.000Z", "2026-10-25T18:00:00.000Z"],
  );
});

test("spring DST gap moves a reminder forward while retaining minutes", () => {
  const date = reminderWallTimeToUTC("2027-03-28", 2, 30, "Europe/Berlin");
  assert.equal(date.toISOString(), "2027-03-28T01:30:00.000Z");
});

test("autumn repeated hour chooses the first occurrence exactly once", () => {
  const date = reminderWallTimeToUTC("2026-10-25", 2, 30, "Europe/Berlin");
  assert.equal(date.toISOString(), "2026-10-25T00:30:00.000Z");
});

test("non-hour timezone offsets are preserved", () => {
  const date = reminderWallTimeToUTC("2026-10-11", 19, 15, "Asia/Kathmandu");
  assert.equal(date.toISOString(), "2026-10-11T13:30:00.000Z");
});

test("half-hour DST gaps use the real offset change rather than adding an hour", () => {
  const date = reminderWallTimeToUTC(
    "2026-10-04",
    2,
    15,
    "Australia/Lord_Howe",
  );
  assert.equal(date.toISOString(), "2026-10-03T15:45:00.000Z");
});

test("invalid clocks are rejected before changing native reminder schedules", () => {
  assert.throws(
    () => planWeeklyDates({ weekday: 0, hour: 19, minute: 0 }, "UTC"),
    /INVALID_REMINDER_CLOCK/,
  );
  assert.throws(
    () => planWeeklyDates({ weekday: 1, hour: 24, minute: 0 }, "UTC"),
    /INVALID_REMINDER_CLOCK/,
  );
});

test("JCuki sound is a short mono PCM WAV without clipping or end clicks", () => {
  const wav = readFileSync(
    new URL("../assets/sounds/jcuki_chime.wav", import.meta.url),
  );
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 44100);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), wav.length - 44);
  const duration = (wav.length - 44) / 2 / 44100;
  assert.ok(duration > 1 && duration < 2);
  let peak = 0;
  for (let position = 44; position < wav.length; position += 2)
    peak = Math.max(peak, Math.abs(wav.readInt16LE(position)));
  assert.ok(peak > 15000 && peak < 20000);
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 4);
});
