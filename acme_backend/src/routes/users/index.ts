import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import { deleteRoute, getRoute, listRoute, updateRoute } from "./routes";

const userRouter = router();
const columns = {
  id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username,
  email: users.email, role: users.role, image: users.image, createdAt: users.createdAt, updatedAt: users.updatedAt,
};
userRouter.openapi(listRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const { limit, offset } = c.req.valid("query");
  return c.json(await db.select(columns).from(users).orderBy(users.id).limit(limit).offset(offset), 200);
});
userRouter.openapi(getRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const [user] = await db.select(columns).from(users).where(eq(users.id, c.req.valid("param").id));
  if (!user) throw new ApiError(404, "User not found");
  return c.json(user, 200);
});
userRouter.openapi(updateRoute, async (c) => {
  const actor = c.get("user");
  requireRole(actor, "admin");
  const { id } = c.req.valid("param");
  const values = c.req.valid("json");
  if (id === actor.id && values.role && values.role !== "admin") throw new ApiError(409, "Another administrator must change your role");
  const [user] = await db.update(users).set({
    ...values, updatedAt: new Date().toISOString(),
    sessionVersion: values.role ? sql`${users.sessionVersion} + CASE WHEN ${users.role} <> ${values.role} THEN 1 ELSE 0 END` : undefined,
  }).where(eq(users.id, id)).returning(columns);
  if (!user) throw new ApiError(404, "User not found");
  return c.json(user, 200);
});
userRouter.openapi(deleteRoute, async (c) => {
  const actor = c.get("user");
  requireRole(actor, "admin");
  const { id } = c.req.valid("param");
  if (id === actor.id) throw new ApiError(409, "Another administrator must delete your account");
  const [user] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (!user) throw new ApiError(404, "User not found");
  return c.json({ message: "User deleted" }, 200);
});
export default userRouter;
