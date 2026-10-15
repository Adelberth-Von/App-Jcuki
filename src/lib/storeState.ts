import type { Group, Profile } from "./types";

/** Explicit saved modes win; a first install with a configured API starts in cloud mode. */
export function resolveWorkspaceMode(
  saved: { apiUrl?: unknown; demoMode?: unknown },
  environmentUrl: string,
  authenticated = false,
): { apiUrl: string; demoMode: boolean } {
  if (authenticated) return { apiUrl: environmentUrl, demoMode: false };
  const apiUrl =
    typeof saved.apiUrl === "string" ? saved.apiUrl : environmentUrl;
  return {
    apiUrl,
    demoMode: typeof saved.demoMode === "boolean" ? saved.demoMode : !apiUrl,
  };
}
/** Migrates old demo IDs and all event references, and applies photo removal to every self member. */
export function reconcileOwnProfile(
  group: Group,
  previousId: string,
  profile: Profile,
): Group {
  if (
    previousId === profile.id &&
    group.members.every(
      (member) =>
        member.id !== profile.id ||
        (member.nickname === profile.nickname &&
          member.zone === profile.zone &&
          member.avatarUri === profile.avatarUri &&
          member.updatedAt === profile.updatedAt),
    )
  )
    return group;
  const members = group.members.map((member) =>
    member.id === previousId || member.id === profile.id
      ? { ...member, ...profile, avatarUri: profile.avatarUri }
      : member,
  );
  return {
    ...group,
    creator: group.creator === previousId ? profile.id : group.creator,
    members,
    events: group.events.map((event) => {
      const responses = { ...event.responses };
      if (
        previousId !== profile.id &&
        Object.prototype.hasOwnProperty.call(responses, previousId)
      ) {
        responses[profile.id] = responses[previousId];
        delete responses[previousId];
      }
      return {
        ...event,
        creator: event.creator === previousId ? profile.id : event.creator,
        responses,
      };
    }),
  };
}
/** A mutation invalidates earlier refresh results without blocking the user's action on network reads. */
export function createOperationGate() {
  let revision = 0,
    mutation = false;
  return {
    startMutation(): number | null {
      if (mutation) return null;
      mutation = true;
      return ++revision;
    },
    finishMutation() {
      mutation = false;
    },
    startRefresh(): number | null {
      return mutation ? null : ++revision;
    },
    invalidate() {
      return ++revision;
    },
    isCurrent(ticket: number) {
      return ticket === revision;
    },
    get busy() {
      return mutation;
    },
  };
}
