import type {
  Availability,
  AvailabilityStatus,
  DayOff,
  Event,
  EventInput,
  EventPageOptions,
  Group,
  GroupSummary,
  Page,
  PageOptions,
  Profile,
} from "./types";

export class APIError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "APIError";
    this.code = code;
    this.status = status;
  }
}
export interface APIClient {
  readonly baseUrl: string;
  getProfile(): Promise<Profile>;
  upsertProfile(profile: Pick<Profile, "nickname" | "zone">): Promise<Profile>;
  listGroups(options?: PageOptions): Promise<Page<GroupSummary>>;
  createGroup(name: string): Promise<GroupSummary>;
  joinGroup(code: string): Promise<GroupSummary>;
  getGroup(groupId: string): Promise<Group>;
  updateAvailability(groupId: string, slots: Availability[]): Promise<void>;
  updateDaysOff(
    groupId: string,
    daysOff: DayOff[],
    slots?: Availability[],
  ): Promise<DayOff[]>;
  listEvents(groupId: string, options?: EventPageOptions): Promise<Page<Event>>;
  createEvent(groupId: string, input: EventInput): Promise<Event>;
  respondToEvent(
    groupId: string,
    eventId: string,
    value: AvailabilityStatus,
  ): Promise<void>;
  cancelEvent(groupId: string, eventId: string): Promise<void>;
  uploadAvatar(image: {
    base64: string;
    mime: "image/jpeg" | "image/png";
  }): Promise<Profile>;
  removeAvatar(): Promise<Profile>;
  avatarHeaders(): Promise<{ Authorization: string }>;
}
export function createApiClient({
  baseUrl,
  getToken,
  fetcher = fetch,
}: {
  baseUrl: string;
  getToken: () => Promise<string>;
  fetcher?: typeof fetch;
}): APIClient {
  const url = new URL(baseUrl.trim());
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname)
    )
  )
    throw new Error("API_HTTPS_REQUIRED");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  )
    throw new Error("API_BASE_URL_INVALID");
  const origin = url.origin;
  const query = (options: PageOptions & { view?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.cursor) params.set("cursor", options.cursor);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.view) params.set("view", options.view);
    return params.size ? "?" + params.toString() : "";
  };
  async function headers(): Promise<{ Authorization: string }> {
    const token = await getToken();
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new APIError("IDENTITY_INVALID", 401);
    return { Authorization: "Bearer " + token };
  }
  async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(origin + "/api" + path, {
        method,
        headers: {
          ...(await headers()),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new APIError(
          typeof data.error === "string" ? data.error : "SERVER_ERROR",
          response.status,
        );
      return data as T;
    } catch (error) {
      if (error instanceof APIError) throw error;
      if (controller.signal.aborted) throw new APIError("NETWORK_TIMEOUT", 0);
      throw new APIError("NETWORK_UNAVAILABLE", 0);
    } finally {
      clearTimeout(timeout);
    }
  }
  const groupPath = (groupId: string) =>
    "/groups/" + encodeURIComponent(groupId);
  return {
    baseUrl: origin,
    getProfile: () => request("/me"),
    upsertProfile: (profile) => request("/me", "PUT", profile),
    listGroups: (options) => request("/groups" + query(options)),
    createGroup: (name) => request("/groups", "POST", { name }),
    joinGroup: (code) => request("/join", "POST", { code }),
    getGroup: (groupId) => request(groupPath(groupId)),
    updateAvailability: async (groupId, slots) => {
      await request(groupPath(groupId) + "/availability", "PUT", { slots });
    },
    updateDaysOff: async (groupId, daysOff, slots) => {
      const result = await request<{ daysOff: DayOff[] }>(
        groupPath(groupId) + "/days-off",
        "PUT",
        { daysOff, ...(slots ? { slots } : {}) },
      );
      return result.daysOff;
    },
    listEvents: (groupId, options) =>
      request(groupPath(groupId) + "/events" + query(options)),
    createEvent: (groupId, input) =>
      request(groupPath(groupId) + "/events", "POST", input),
    respondToEvent: async (groupId, eventId, value) => {
      await request(
        groupPath(groupId) +
          "/events/" +
          encodeURIComponent(eventId) +
          "/response",
        "PUT",
        { value },
      );
    },
    cancelEvent: async (groupId, eventId) => {
      await request(
        groupPath(groupId) + "/events/" + encodeURIComponent(eventId),
        "DELETE",
      );
    },
    uploadAvatar: (image) => request("/me/avatar", "PUT", image),
    removeAvatar: () => request("/me/avatar", "DELETE"),
    avatarHeaders: headers,
  };
}
