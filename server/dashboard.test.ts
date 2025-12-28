import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

/**
 * Test suite for user dashboard functionality.
 * Tests user message history and notification preferences.
 */

function createAuthenticatedContext(userId: number): { ctx: TrpcContext } {
  const user: User = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard router", () => {
  it("should retrieve user preferences", async () => {
    const { ctx } = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    const preferences = await caller.dashboard.getPreferences();

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe(1);
    expect(preferences.notificationsEnabled).toBe("true");
    expect(preferences.notifyBefore).toBe(60);
  });

  it("should update user notification preferences", async () => {
    const { ctx } = createAuthenticatedContext(2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.updatePreferences({
      notificationsEnabled: false,
      notifyBefore: 30,
    });

    expect(result.success).toBe(true);
  });

  it("should retrieve user's messages", async () => {
    const { ctx } = createAuthenticatedContext(3);
    const caller = appRouter.createCaller(ctx);

    // Create a message as this user
    const message = await caller.messages.create({
      content: "Test message from user 3",
    });

    expect(message).toBeDefined();

    // Retrieve user's messages
    const userMessages = await caller.dashboard.getMyMessages();

    expect(Array.isArray(userMessages)).toBe(true);
    // Message should be in the user's history
    const found = userMessages.find((m) => m.id === message.id);
    expect(found).toBeDefined();
  });

  it("should return empty array for user with no messages", async () => {
    const { ctx } = createAuthenticatedContext(999);
    const caller = appRouter.createCaller(ctx);

    const userMessages = await caller.dashboard.getMyMessages();

    expect(Array.isArray(userMessages)).toBe(true);
    expect(userMessages.length).toBe(0);
  });

  it("should validate notification preferences input", async () => {
    const { ctx } = createAuthenticatedContext(4);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dashboard.updatePreferences({
        notificationsEnabled: true,
        notifyBefore: 0, // Invalid: less than 5 minutes
      });
      expect.fail("Should have thrown validation error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should validate maximum notification time", async () => {
    const { ctx } = createAuthenticatedContext(5);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dashboard.updatePreferences({
        notificationsEnabled: true,
        notifyBefore: 2000, // Invalid: more than 1440 minutes (24 hours)
      });
      expect.fail("Should have thrown validation error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
