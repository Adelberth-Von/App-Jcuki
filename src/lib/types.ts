export type Language = "id" | "en";
export type AvailabilityStatus = "yes" | "maybe" | "no";
export interface Availability {
  id: string;
  start: string;
  end: string;
  status: AvailabilityStatus;
}
export interface Profile {
  fullName?: string;
  id: string;
  nickname: string;
  zone: string;
  avatarUri?: string;
  updatedAt?: string;
}
export interface DayOff {
  date: string;
  zone: string;
  confirmedAt: string;
}
export interface Member extends Profile {
  slots: Availability[];
  daysOff?: DayOff[];
  joinedAt?: string;
  color?: string;
}
export interface GroupSummary {
  id: string;
  name: string;
  code: string;
  creator: string;
  createdAt: string;
  memberCount: number;
}
export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  minimum: number;
  creator: string;
  responses: Record<string, AvailabilityStatus>;
  cancelled?: boolean;
  createdAt?: string;
}
export interface Group extends GroupSummary {
  members: Member[];
  events: Event[];
  eventsNextCursor?: string | null;
  historyLoaded?: boolean;
  historyNextCursor?: string | null;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface PageOptions {
  cursor?: string | null;
  limit?: number;
}
export interface EventInput {
  title: string;
  start: string;
  end: string;
  minimum: number;
}
export interface EventPageOptions extends PageOptions {
  view?: "upcoming" | "history" | "all";
}
export interface Match {
  start: number;
  end: number;
  users: string[];
}

export type ActivityKind =
  | "member_joined"
  | "schedule_updated"
  | "event_created"
  | "response_updated"
  | "event_cancelled"
  | "profile_updated";
export interface Activity {
  id: string;
  groupId: string;
  actorId: string;
  actorName: string;
  groupName: string;
  kind: ActivityKind;
  eventId?: string | null;
  createdAt: string;
}
export interface PushDevice {
  token: string;
  language: Language;
  sound: boolean;
  zone: string;
}
