import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMessage, getActiveMessages, deleteMessageById, getUserMessages, getUserPreferences, updateUserPreferences } from "./db";
import { eq } from "drizzle-orm";
import { messages as messagesTable } from "../drizzle/schema";
import { getDb } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  messages: router({
    create: publicProcedure
      .input(z.object({ content: z.string().min(1).max(500) }))
      .mutation(async ({ input, ctx }) => {
        const message = await createMessage(input.content);
        
        // If user is authenticated, associate message with their ID
        if (ctx.user?.id) {
          const db = await getDb();
          if (db) {
            await db.update(messagesTable).set({ userId: ctx.user.id }).where(eq(messagesTable.id, message.id));
          }
        }
        
        return message;
      }),

    list: publicProcedure.query(async () => {
      const activeMessages = await getActiveMessages();
      return activeMessages;
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const deleted = await deleteMessageById(input.id);
        return { success: deleted };
      }),
  }),

  dashboard: router({
    getMyMessages: protectedProcedure.query(async ({ ctx }) => {
      const userMessages = await getUserMessages(ctx.user.id);
      return userMessages;
    }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const preferences = await getUserPreferences(ctx.user.id);
      return preferences;
    }),

    updatePreferences: protectedProcedure
      .input(z.object({
        notificationsEnabled: z.boolean(),
        notifyBefore: z.number().min(5).max(1440),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await updateUserPreferences(
          ctx.user.id,
          input.notificationsEnabled,
          input.notifyBefore
        );
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
