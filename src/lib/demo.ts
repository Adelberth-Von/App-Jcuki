import { addDays, localDate, wallToUTC } from "./domain";
import type { Event, Group, Member, Profile } from "./types";

// Example friends are only available in the explicitly labelled demo workspace. No cloud account is created here.
export function createDemoGroups(profile: Profile, now = Date.now()): Group[] {
  const tomorrow = addDays(localDate(now, "Asia/Jakarta"), 1);
  const slots = [0, 2, 4].map((day, index) => ({
    id: `demo-slot-${index}`,
    start: wallToUTC(addDays(tomorrow, day), "20:00", "Asia/Jakarta"),
    end: wallToUTC(addDays(tomorrow, day), "23:00", "Asia/Jakarta"),
    status: "yes" as const,
  }));
  const members: Member[] = [
    { ...profile, slots: slots.map((slot) => ({ ...slot })) },
    {
      id: "demo-alex",
      nickname: "Alex",
      zone: "Europe/Berlin",
      slots: slots.map((slot) => ({ ...slot })),
      color: "blue",
    },
    {
      id: "demo-nara",
      nickname: "Nara",
      zone: "Asia/Jayapura",
      slots: slots.map((slot) => ({ ...slot })),
      color: "peach",
    },
  ];
  const events: Event[] = Array.from({ length: 7 }, (_, index) => ({
    id: `demo-event-${index}`,
    title: ["Friday catch-up", "Game night", "Coffee & stories"][index % 3],
    start: wallToUTC(addDays(tomorrow, index), "21:00", "Asia/Jakarta"),
    end: wallToUTC(addDays(tomorrow, index), "22:00", "Asia/Jakarta"),
    minimum: 3,
    creator: profile.id,
    createdAt: new Date(now).toISOString(),
    responses: {
      [profile.id]: "yes",
      "demo-alex": "yes",
      "demo-nara": index === 0 ? "yes" : "maybe",
    },
  }));
  return [
    {
      id: "demo-afterhours",
      name: "After Hours",
      code: "DEMO-ONLY",
      creator: profile.id,
      createdAt: new Date(now).toISOString(),
      memberCount: members.length,
      members,
      events,
    },
  ];
}
