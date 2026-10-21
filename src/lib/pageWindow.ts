import type { APIClient } from "./api";
import type { Group, Page } from "./types";

/** Refresh the pages the person has opened, including their current continuation cursor. */
export async function readPageWindow<T extends { id: string }>(
  first: Page<T>,
  minimum: number,
  load: (cursor: string) => Promise<Page<T>>,
): Promise<Page<T>> {
  const items = new Map(first.items.map((item) => [item.id, item]));
  let cursor = first.nextCursor;
  const visited = new Set<string>();
  while (cursor && items.size < minimum) {
    if (visited.has(cursor)) throw new Error("INVALID_CURSOR");
    visited.add(cursor);
    const page = await load(cursor);
    for (const item of page.items) items.set(item.id, item);
    cursor = page.nextCursor;
  }
  return { items: [...items.values()], nextCursor: cursor };
}

export async function refreshGroupWindow(
  api: APIClient,
  fresh: Group,
  previous: Group | null,
  now = Date.now(),
): Promise<Group> {
  if (!previous || fresh.id !== previous.id) return fresh;
  const upcomingCount = previous.events.filter(
    (event) => Date.parse(event.end) >= now,
  ).length;
  const upcoming = await readPageWindow(
    { items: fresh.events, nextCursor: fresh.eventsNextCursor || null },
    upcomingCount,
    (cursor) => api.listEvents(fresh.id, { cursor, limit: 20 }),
  );
  if (!previous.historyLoaded)
    return {
      ...fresh,
      events: upcoming.items,
      eventsNextCursor: upcoming.nextCursor,
    };
  const history = await readPageWindow(
    await api.listEvents(fresh.id, { view: "history", limit: 20 }),
    previous.events.length - upcomingCount,
    (cursor) =>
      api.listEvents(fresh.id, { view: "history", cursor, limit: 20 }),
  );
  return {
    ...fresh,
    events: [...upcoming.items, ...history.items],
    eventsNextCursor: upcoming.nextCursor,
    historyLoaded: true,
    historyNextCursor: history.nextCursor,
  };
}
