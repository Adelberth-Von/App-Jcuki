import test from "node:test";
import assert from "node:assert/strict";
import { invitationCode, invitationLink } from "../src/lib/invitations.ts";
import { createApiClient } from "../src/lib/api.ts";
test("invites accept a copied code or app link, without arbitrary URLs or credentials", () => {
  const code = "D3MCYGFT63V4";
  assert.equal(invitationCode(invitationLink(code)), code);
  assert.equal(invitationCode("d3mc ygft 63v4"), code);
  for (const value of [
    "https://evil.example?code=" + code,
    "jcuki://join?code=invalid",
    "jcuki://other?code=" + code,
  ])
    assert.equal(invitationCode(value), "");
});
test("Supabase function prefix survives requests and persisted base URL", async () => {
  const url = "https://project.supabase.co/functions/v1/jcuki";
  let requested;
  const client = createApiClient({
    baseUrl: url + "/",
    getToken: async () => "a".repeat(64),
    fetcher: async (value) => {
      requested = value;
      return new Response(JSON.stringify({ items: [], nextCursor: null }));
    },
  });
  await client.listGroups();
  assert.equal(requested, url + "/api/groups");
  assert.equal(client.baseUrl, url);
});
