import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import { createPayment, deletePayment, getRoute, listRoute, updatePayment } from "./routes";

const paymentRouter = router();
paymentRouter.openapi(listRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const { limit, offset } = c.req.valid("query");
  return c.json(await db.select().from(payments).orderBy(desc(payments.id)).limit(limit).offset(offset), 200);
});
paymentRouter.openapi(getRoute, async (c) => {
  requireRole(c.get("user"), "admin");
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.valid("param").id));
  if (!payment) throw new ApiError(404, "Payment not found");
  return c.json(payment, 200);
});
paymentRouter.openapi(createPayment, (c) => {
  requireRole(c.get("user"), "admin");
  c.header("Allow", "GET");
  return c.json({ message: "Create payments through checkout" }, 405);
});
paymentRouter.openapi(updatePayment, (c) => {
  requireRole(c.get("user"), "admin");
  c.header("Allow", "GET");
  return c.json({ message: "Payment records cannot be edited" }, 405);
});
paymentRouter.openapi(deletePayment, (c) => {
  requireRole(c.get("user"), "admin");
  c.header("Allow", "GET");
  return c.json({ message: "Payment records are retained" }, 405);
});
export default paymentRouter;
