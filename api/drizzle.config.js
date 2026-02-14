export default {
  schema: './lib/db/schema.js',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/task_blaster_dev',
  },
  verbose: true,
  strict: true,
};
