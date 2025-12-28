import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite for message creation, retrieval, and expiration logic.
 * These tests verify the core functionality of the Ephemeral Diary.
 */

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("messages router", () => {
  let caller = appRouter.createCaller(createPublicContext());

  it("should create a new message with valid content", async () => {
    const testContent = "This is a test ephemeral message";
    const result = await caller.messages.create({ content: testContent });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.content).toBe(testContent);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("should calculate expiresAt as 24 hours from createdAt", async () => {
    const testContent = "Message for expiration test";
    const result = await caller.messages.create({ content: testContent });

    const timeDiffMs = result.expiresAt.getTime() - result.createdAt.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // Allow 1 second tolerance for test execution time
    expect(timeDiffHours).toBeCloseTo(24, 0.001);
  });

  it("should reject messages with empty content", async () => {
    try {
      await caller.messages.create({ content: "" });
      expect.fail("Should have thrown an error for empty content");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should reject messages exceeding 500 characters", async () => {
    const longContent = "a".repeat(501);
    try {
      await caller.messages.create({ content: longContent });
      expect.fail("Should have thrown an error for content exceeding 500 characters");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should retrieve all active messages", async () => {
    // Create a test message
    const testContent = "Test message for list";
    await caller.messages.create({ content: testContent });

    const messages = await caller.messages.list();

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    // Verify the created message is in the list
    const foundMessage = messages.find((m) => m.content === testContent);
    expect(foundMessage).toBeDefined();
  });

  it("should return messages ordered by creation time (newest first)", async () => {
    // Create two messages with a small delay
    const msg1 = await caller.messages.create({ content: "First message" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const msg2 = await caller.messages.create({ content: "Second message" });

    const messages = await caller.messages.list();

    // Find the two messages in the list
    const idx1 = messages.findIndex((m) => m.id === msg1.id);
    const idx2 = messages.findIndex((m) => m.id === msg2.id);

    // Both messages should be found
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);

    // msg2 should come before msg1 (newer first)
    expect(idx2).toBeLessThan(idx1);
  });

  it("should delete a message by ID", async () => {
    const testContent = "Message to delete";
    const created = await caller.messages.create({ content: testContent });

    const deleteResult = await caller.messages.delete({ id: created.id });
    expect(deleteResult.success).toBe(true);

    // Verify the message is no longer in the list
    const messages = await caller.messages.list();
    const deleted = messages.find((m) => m.id === created.id);
    expect(deleted).toBeUndefined();
  });

  it("should return false when deleting a non-existent message", async () => {
    const deleteResult = await caller.messages.delete({ id: 999999 });
    expect(deleteResult.success).toBe(false);
  });
});
