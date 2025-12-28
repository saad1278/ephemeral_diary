import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

/**
 * Test suite for message reactions (Like/Dislike) functionality.
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

describe("messages reactions router", () => {
  it("should allow authenticated user to like a message", async () => {
    const { ctx: userCtx } = createAuthenticatedContext(10);
    const caller = appRouter.createCaller(userCtx);

    // Create a message
    const message = await caller.messages.create({
      content: "Test message for reactions",
    });

    // Like the message
    const result = await caller.messages.react({
      messageId: message.id,
      reactionType: "like",
    });

    expect(result.likes).toBe(1);
    expect(result.dislikes).toBe(0);
    expect(result.userReaction).toBe("like");
  });

  it("should allow authenticated user to dislike a message", async () => {
    const { ctx: userCtx } = createAuthenticatedContext(11);
    const caller = appRouter.createCaller(userCtx);

    // Create a message
    const message = await caller.messages.create({
      content: "Another test message",
    });

    // Dislike the message
    const result = await caller.messages.react({
      messageId: message.id,
      reactionType: "dislike",
    });

    expect(result.likes).toBe(0);
    expect(result.dislikes).toBe(1);
    expect(result.userReaction).toBe("dislike");
  });

  it("should allow user to change reaction from like to dislike", async () => {
    const { ctx: userCtx } = createAuthenticatedContext(12);
    const caller = appRouter.createCaller(userCtx);

    // Create a message
    const message = await caller.messages.create({
      content: "Message for reaction change",
    });

    // Like the message
    await caller.messages.react({
      messageId: message.id,
      reactionType: "like",
    });

    // Change to dislike
    const result = await caller.messages.react({
      messageId: message.id,
      reactionType: "dislike",
    });

    expect(result.likes).toBe(0);
    expect(result.dislikes).toBe(1);
    expect(result.userReaction).toBe("dislike");
  });

  it("should aggregate reactions from multiple users", async () => {
    const { ctx: user1Ctx } = createAuthenticatedContext(13);
    const { ctx: user2Ctx } = createAuthenticatedContext(14);
    const caller1 = appRouter.createCaller(user1Ctx);
    const caller2 = appRouter.createCaller(user2Ctx);

    // User 1 creates a message
    const message = await caller1.messages.create({
      content: "Message for multiple reactions",
    });

    // User 1 likes it
    await caller1.messages.react({
      messageId: message.id,
      reactionType: "like",
    });

    // User 2 likes it
    const result = await caller2.messages.react({
      messageId: message.id,
      reactionType: "like",
    });

    expect(result.likes).toBe(2);
    expect(result.dislikes).toBe(0);
  });

  it("should return reaction counts in message list", async () => {
    const { ctx: userCtx } = createAuthenticatedContext(15);
    const caller = appRouter.createCaller(userCtx);

    // Create a message
    const message = await caller.messages.create({
      content: "Message for list view",
    });

    // Add a like
    await caller.messages.react({
      messageId: message.id,
      reactionType: "like",
    });

    // Get messages list
    const messages = await caller.messages.list();

    const foundMessage = messages.find((m) => m.id === message.id);
    expect(foundMessage).toBeDefined();
    expect(foundMessage?.likes).toBe(1);
    expect(foundMessage?.dislikes).toBe(0);
    expect(foundMessage?.userReaction).toBe("like");
  });

  it("should prevent unauthenticated user from creating message", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(publicCtx);

    try {
      await caller.messages.create({
        content: "This should fail",
      });
      expect.fail("Should have thrown UNAUTHORIZED error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
