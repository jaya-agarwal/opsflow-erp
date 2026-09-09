import { app } from './app';
import { config } from './config';
import { pool } from './db';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`OpsFlow API listening on :${config.port} (${config.nodeEnv})`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Closing HTTP server...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
