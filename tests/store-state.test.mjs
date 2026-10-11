import test from "node:test";
import assert from "node:assert/strict";
import {
  createOperationGate,
  reconcileOwnProfile,
  resolveWorkspaceMode,
} from "../src/lib/storeState.ts";

test("configured first launch uses cloud; explicitly saved demo/disconnected choices persist", () => {
  assert.deepEqual(resolveWorkspaceMode({}, "https://api.test"), {
    apiUrl: "https://api.test",
    demoMode: false,
  });
  assert.deepEqual(resolveWorkspaceMode({}, ""), {
    apiUrl: "",
    demoMode: true,
  });
  assert.deepEqual(
    resolveWorkspaceMode({ demoMode: true }, "https://api.test"),
    { apiUrl: "https://api.test", demoMode: true },
  );
  assert.deepEqual(
    resolveWorkspaceMode({ apiUrl: "", demoMode: true }, "https://api.test"),
    { apiUrl: "", demoMode: true },
  );
  assert.deepEqual(resolveWorkspaceMode({ apiUrl: "", demoMode: false }, ""), {
    apiUrl: "",
    demoMode: false,
  });
});
test("a mutation supersedes stale refresh and no refresh or second mutation starts during that write", () => {
  const gate = createOperationGate(),
    firstRefresh = gate.startRefresh();
  assert.ok(gate.isCurrent(firstRefresh));
  const mutation = gate.startMutation();
  assert.ok(gate.isCurrent(mutation));
  assert.equal(gate.isCurrent(firstRefresh), false);
  assert.equal(gate.startMutation(), null);
  assert.equal(gate.startRefresh(), null);
  gate.finishMutation();
  const nextRefresh = gate.startRefresh();
  assert.ok(gate.isCurrent(nextRefresh));
  assert.equal(gate.isCurrent(mutation), false);
  gate.invalidate();
  assert.equal(gate.isCurrent(nextRefresh), false);
});
test("identity migration retains availability and event responses, while photo removal clears every own member", () => {
  const oldId = "a".repeat(32),
    newId = "a".repeat(64);
  const group = {
    id: "demo",
    name: "Circle",
    code: "DEMO",
    creator: oldId,
    createdAt: "2026-10-11T00:00:00Z",
    memberCount: 2,
    members: [
      {
        id: oldId,
        nickname: "Old",
        zone: "UTC",
        avatarUri: "file://old.jpg",
        slots: [
          {
            id: "slot",
            start: "2026-10-12T13:00:00Z",
            end: "2026-10-12T14:00:00Z",
            status: "yes",
          },
        ],
      },
      {
        id: "friend",
        nickname: "Friend",
        zone: "UTC",
        avatarUri: "file://friend.jpg",
        slots: [],
      },
    ],
    events: [
      {
        id: "event",
        title: "Plan",
        start: "2026-10-12T13:00:00Z",
        end: "2026-10-12T14:00:00Z",
        creator: oldId,
        minimum: 2,
        responses: { [oldId]: "yes", friend: "maybe" },
      },
    ],
  };
  const next = reconcileOwnProfile(group, oldId, {
    id: newId,
    nickname: "New",
    zone: "Asia/Jakarta",
  });
  assert.equal(next.members[0].id, newId);
  assert.equal(next.members[0].slots.length, 1);
  assert.equal(next.members[0].avatarUri, undefined);
  assert.equal(next.members[1].avatarUri, "file://friend.jpg");
  assert.equal(next.creator, newId);
  assert.equal(next.events[0].creator, newId);
  assert.deepEqual(next.events[0].responses, {
    [newId]: "yes",
    friend: "maybe",
  });
  assert.equal(group.members[0].avatarUri, "file://old.jpg");
  assert.equal(group.members[0].id, oldId);
  const groups = [group, { ...group, id: "second" }].map((item) =>
    reconcileOwnProfile(item, oldId, {
      id: newId,
      nickname: "New",
      zone: "UTC",
    }),
  );
  assert.ok(groups.every((item) => item.members[0].avatarUri === undefined));
});
