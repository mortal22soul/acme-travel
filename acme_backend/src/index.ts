import { serve } from "@hono/node-server";
import { app } from "@/app";

const startServer = async () => {
  const port = Number(process.env.PORT) || 3000;
  console.log(`Server is running on http://localhost:${port}`);

  const server = serve({
    fetch: app.fetch,
    port,
  });
  const shutdown = () => server.close();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer();
