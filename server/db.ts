import { eq, gt, lte, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, messages, userPreferences } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new ephemeral message.
 * Automatically sets expiresAt to 24 hours from now.
 */
export async function createMessage(content: string): Promise<typeof messages.$inferSelect> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  await db.insert(messages).values({
    content,
    createdAt: now,
    expiresAt,
  });

  // Fetch and return the most recently created message
  const created = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.id))
    .limit(1);

  if (!created.length) {
    throw new Error("Failed to create message");
  }

  return created[0];
}

/**
 * Get all active (non-expired) messages, ordered by creation time (newest first).
 */
export async function getActiveMessages(): Promise<typeof messages.$inferSelect[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get messages: database not available");
    return [];
  }

  const now = new Date();
  const result = await db
    .select()
    .from(messages)
    .where(gt(messages.expiresAt, now))
    .orderBy(desc(messages.createdAt));

  return result;
}

/**
 * Delete expired messages (where expiresAt <= now).
 * Returns the number of deleted messages.
 */
export async function deleteExpiredMessages(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete expired messages: database not available");
    return 0;
  }

  const now = new Date();
  // Get count of expired messages before deletion
  const expiredMessages = await db
    .select()
    .from(messages)
    .where(lte(messages.expiresAt, now));

  if (expiredMessages.length > 0) {
    await db.delete(messages).where(lte(messages.expiresAt, now));
  }

  return expiredMessages.length;
}

/**
 * Delete a specific message by ID.
 */
export async function deleteMessageById(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete message: database not available");
    return false;
  }

  // Check if message exists
  const existing = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  
  if (existing.length === 0) {
    return false;
  }

  await db.delete(messages).where(eq(messages.id, id));

  return true;
}


/**
 * Get all messages posted by a specific user (for dashboard).
 * Returns messages ordered by creation time (newest first).
 */
export async function getUserMessages(userId: number): Promise<typeof messages.$inferSelect[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user messages: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt));

  return result;
}

/**
 * Get or create user preferences.
 */
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default preferences
  await db.insert(userPreferences).values({
    userId,
    notificationsEnabled: "true",
    notifyBefore: 60,
  });

  const created = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return created[0];
}

/**
 * Update user notification preferences.
 */
export async function updateUserPreferences(
  userId: number,
  notificationsEnabled: boolean,
  notifyBefore: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update preferences: database not available");
    return false;
  }

  await db
    .update(userPreferences)
    .set({
      notificationsEnabled: notificationsEnabled ? "true" : "false",
      notifyBefore,
    })
    .where(eq(userPreferences.userId, userId));

  return true;
}
