import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMessage, getActiveMessages, deleteMessageById, getUserMessages, getUserPreferences, updateUserPreferences, addOrUpdateReaction, getReactionCounts, getUserReaction } from "./db";
import { eq } from "drizzle-orm";
import { messages as messagesTable } from "../drizzle/schema";
import { getDb } from "./db";
import { TRPCError } from "@trpc/server";

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
    create: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(500) }))
      .mutation(async ({ input, ctx }) => {
        const message = await createMessage(input.content);
        
        // Associate message with authenticated user
        const db = await getDb();
        if (db) {
          await db.update(messagesTable).set({ userId: ctx.user.id }).where(eq(messagesTable.id, message.id));
        }
        
        return message;
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      const activeMessages = await getActiveMessages();
      
      // Enrich messages with reaction counts and user's reaction
      const enrichedMessages = await Promise.all(
        activeMessages.map(async (msg) => {
          const { likes, dislikes } = await getReactionCounts(msg.id);
          let userReaction: "like" | "dislike" | null = null;
          
          if (ctx.user?.id) {
            userReaction = await getUserReaction(msg.id, ctx.user.id);
          }
          
          return {
            ...msg,
            likes,
            dislikes,
            userReaction,
          };
        })
      );
      
      return enrichedMessages;
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const deleted = await deleteMessageById(input.id);
        return { success: deleted };
      }),

    react: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        reactionType: z.enum(["like", "dislike"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await addOrUpdateReaction(input.messageId, ctx.user.id, input.reactionType);
        
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add reaction",
          });
        }

        // Return updated counts
        const { likes, dislikes } = await getReactionCounts(input.messageId);
        const userReaction = await getUserReaction(input.messageId, ctx.user.id);

        return { likes, dislikes, userReaction };
      }),

    getReactions: publicProcedure
      .input(z.object({ messageId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { likes, dislikes } = await getReactionCounts(input.messageId);
        let userReaction: "like" | "dislike" | null = null;
        
        if (ctx.user?.id) {
          userReaction = await getUserReaction(input.messageId, ctx.user.id);
        }
        
        return { likes, dislikes, userReaction };
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
