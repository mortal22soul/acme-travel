import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, users } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import { createProfile, deleteRoute, getRoute, listRoute, updateRoute } from "./routes";

const resource = router();

resource.openapi(listRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const { limit, offset } = c.req.valid("query");
  return c.json(await db.select().from(agents).orderBy(agents.id).limit(limit).offset(offset), 200);
});
resource.openapi(getRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const [profile] = await db.select().from(agents).where(eq(agents.id, c.req.valid("param").id));
  if (!profile) throw new ApiError(404, "Profile not found");
  return c.json(profile, 200);
});
resource.openapi(createProfile, async (c) => {
  requireRole(c.get("user"), "admin");
  const values = c.req.valid("json");
  const profile = await db.transaction(async (tx) => {
    const [user] = await tx.select({ role: users.role }).from(users).where(eq(users.id, values.userId)).for("update");
    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "agent") throw new ApiError(409, "The account must have the agent role");
    const [created] = await tx.insert(agents).values(values).returning();
    return created;
  });
  return c.json(profile, 201);
});
resource.openapi(updateRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const [profile] = await db.update(agents).set({ ...c.req.valid("json"), updatedAt: new Date().toISOString() })
    .where(eq(agents.id, c.req.valid("param").id)).returning();
  if (!profile) throw new ApiError(404, "Profile not found");
  return c.json(profile, 200);
});
resource.openapi(deleteRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const [profile] = await db.delete(agents).where(eq(agents.id, c.req.valid("param").id)).returning({ id: agents.id });
  if (!profile) throw new ApiError(404, "Profile not found");
  return c.json({ message: "Profile deleted" }, 200);
});

export default resource;
