import path from 'node:path';
import dotenv from 'dotenv';

// Always load the root .env regardless of whether npm runs this workspace
// with the repo root or apps/api as the current working directory.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is missing. Create a .env file in the project root before starting OpsFlow.');
}
if (!config.jwtSecret && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET is required in production. Configure it as an environment variable.');
}
if (!config.jwtSecret) config.jwtSecret = 'opsflow-development-only-secret';
