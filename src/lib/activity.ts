import type { Activity, Group } from "./types";
export const activityKey = (item: Pick<Activity, "createdAt" | "id">) =>
  item.createdAt + ":" + item.id;
export function mergeActivity(current: Activity[], incoming: Activity[]) {
  return [
    ...new Map(
      [...current, ...incoming].map((item) => [item.id, item]),
    ).values(),
  ]
    .sort((a, b) => activityKey(b).localeCompare(activityKey(a)))
    .slice(0, 500);
}
export function demoActivity(group: Group, now = Date.now()): Activity[] {
  const kinds = [
    "schedule_updated",
    "event_created",
    "response_updated",
    "member_joined",
  ] as const;
  const friends = group.members.filter(
    (member) => member.nickname !== "" && member.id.startsWith("demo-"),
  );
  return Array.from({ length: 11 }, (_, i) => ({
    id: `demo-activity-${i}`,
    groupId: group.id,
    actorId: friends[i % friends.length]?.id || group.creator,
    actorName: friends[i % friends.length]?.nickname || group.name,
    groupName: group.name,
    kind: kinds[i % 4],
    eventId:
      i % 4 === 1 ? group.events[i % group.events.length]?.id : undefined,
    createdAt: new Date(now - (i + 1) * 45 * 60000).toISOString(),
  }));
}
