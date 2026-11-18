import type { users } from "@/db/schema/users";

export type Actor = Pick<typeof users.$inferSelect, "id" | "email" | "role"> & { sessionId: string };
export type AppEnv = { Variables: { user: Actor }; Bindings: { incoming?: { socket?: { remoteAddress?: string } } } };
