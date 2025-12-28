import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMessage, getActiveMessages, deleteMessageById } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
      .mutation(async ({ input }) => {
        const message = await createMessage(input.content);
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
});

export type AppRouter = typeof appRouter;
