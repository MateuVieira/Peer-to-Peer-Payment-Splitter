import { app, logger } from "./app.js";

const PORT = process.env.PORT ?? 3001;

app
  .listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  })
  .on("error", (err: Error) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
