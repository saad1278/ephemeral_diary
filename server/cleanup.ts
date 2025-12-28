import { deleteExpiredMessages } from "./db";

/**
 * Cleanup job that removes expired messages from the database.
 * This runs periodically to maintain database hygiene.
 */
export async function startCleanupJob() {
  // Run cleanup immediately on startup
  await runCleanup();

  // Then run every minute (60,000 milliseconds)
  setInterval(runCleanup, 60 * 1000);

  console.log("[Cleanup] Started automatic cleanup job (runs every 60 seconds)");
}

async function runCleanup() {
  try {
    const deletedCount = await deleteExpiredMessages();
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} expired message(s)`);
    }
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}
