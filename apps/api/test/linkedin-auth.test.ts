import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, uniqueEmail } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";

const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
const userInfoEndpoint = "https://api.linkedin.com/v2/userinfo";

function mockLinkedIn(identity: { sub: string; email: string; name?: string }) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (String(input) === tokenEndpoint) {
      return new Response(
        JSON.stringify({
          access_token: "linkedin-access-token",
          expires_in: 3600,
          scope: "openid profile email",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (String(input) === userInfoEndpoint) {
      return new Response(JSON.stringify(identity), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected LinkedIn request: ${String(input)}`);
  });
}

describe("LinkedIn OAuth/OIDC authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("creates a user, issues the existing JWT, and redirects with a fragment token", async () => {
    mockLinkedIn({
      sub: "linkedin-sub-1",
      email: uniqueEmail("linkedin"),
      name: "LinkedIn User",
    });

    const initiation = await request(app).get("/auth/linkedin").expect(302);
    const authorizationUrl = new URL(initiation.headers.location);
    const state = authorizationUrl.searchParams.get("state")!;

    const callback = await request(app)
      .get("/auth/linkedin/callback")
      .query({ code: "authorization-code", state })
      .set("Cookie", initiation.headers["set-cookie"])
      .expect(302);

    const redirect = new URL(callback.headers.location);
    expect(redirect.pathname).toBe("/auth/linkedin/callback");
    expect(redirect.search).toBe("");
    expect(redirect.hash).toMatch(/^#token=.+/);

    const fragment = new URLSearchParams(redirect.hash.slice(1));
    const token = fragment.get("token")!;
    // A brand-new account is flagged so the frontend starts Skills onboarding.
    expect(fragment.get("new")).toBe("1");
    const currentUser = await request(app)
      .get("/auth/me")
      .set(bearer(token))
      .expect(200);

    expect(currentUser.body.data.email).toContain("@example.test");
    expect(
      await prisma.user.findUnique({ where: { provider_providerId: { provider: "linkedin", providerId: "linkedin-sub-1" } } })
    ).not.toBeNull();
  });

  it("links LinkedIn to an existing email account", async () => {
    const existing = await createUser(app, { email: uniqueEmail("existing") });
    mockLinkedIn({ sub: "linkedin-sub-2", email: existing.email });

    const initiation = await request(app).get("/auth/linkedin").expect(302);
    const state = new URL(initiation.headers.location).searchParams.get("state")!;
    const callback = await request(app)
      .get("/auth/linkedin/callback")
      .query({ code: "authorization-code", state })
      .set("Cookie", initiation.headers["set-cookie"])
      .expect(302);

    // Linking an existing account is a login, not a signup: no onboarding flag.
    const fragment = new URLSearchParams(
      callback.headers.location.split("#")[1] ?? ""
    );
    expect(fragment.get("token")).toBeTruthy();
    expect(fragment.get("new")).toBeNull();

    expect(await prisma.user.count()).toBe(1);
    expect(
      await prisma.user.findUnique({ where: { id: existing.id } })
    ).toMatchObject({ provider: "linkedin", providerId: "linkedin-sub-2" });
  });
});
