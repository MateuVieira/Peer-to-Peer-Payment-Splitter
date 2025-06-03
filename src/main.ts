import { app, logger } from './app.js';

const PORT = process.env.PORT ?? 3001;

const startServer = () => {
  try {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Access it at http://localhost:${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.fatal(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
