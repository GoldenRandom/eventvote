# Cloudflare D1 Database Setup Guide

This project uses **Cloudflare D1** for all database operations. D1 is a serverless SQL database built on SQLite.

## Quick Setup

### 1. Create the Database

```bash
npm run db:create
```

This will create a D1 database and output a database ID. Copy this ID and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "voting-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Paste the ID here
```

### 2. Run Migrations

For production/remote database:
```bash
npm run db:migrate
```

For local development:
```bash
npm run db:migrate:local
```

### 3. Verify Setup

You can execute SQL queries to verify:

```bash
# Production
npm run db:execute -- --command "SELECT name FROM sqlite_master WHERE type='table';"

# Local
npm run db:execute:local -- --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Database Schema

The system uses three main tables:

1. **events** - Stores voting events
2. **images** - Stores uploaded images for events
3. **votes** - Stores star ratings from voters

See `migrations/0001_initial.sql` for the complete schema.

## Using D1 in Code

All database operations use the `env.DB` binding:

```javascript
// Example: Query events
const events = await env.DB.prepare(
  'SELECT * FROM events WHERE status = ?'
).bind('active').all();

// Example: Insert data
await env.DB.prepare(
  'INSERT INTO events (id, name, status) VALUES (?, ?, ?)'
).bind(id, name, status).run();
```

## Local Development

When running `wrangler dev`, D1 uses a local SQLite database. Migrations run automatically, but you can also run them manually:

```bash
npm run db:migrate:local
```

## Production Deployment

1. **For Cloudflare Workers**: The database binding is automatically configured via `wrangler.toml`

2. **For Cloudflare Pages**: 
   - Go to your Pages project settings
   - Navigate to Functions → D1 database bindings
   - Add binding: `DB` → Select your `voting-db` database
   - Save and redeploy

## Database Operations

The API uses these D1 methods:
- `.prepare()` - Prepare a SQL statement
- `.bind()` - Bind parameters (prevents SQL injection)
- `.first()` - Get first row
- `.all()` - Get all rows
- `.run()` - Execute without returning data

## Troubleshooting

**Issue**: Database not found
- Make sure the database ID in `wrangler.toml` matches your created database
- Verify the binding name is `DB` (case-sensitive)

**Issue**: Foreign key constraints not working
- D1 requires `PRAGMA foreign_keys = ON` (already in migration)
- Make sure migrations ran successfully

**Issue**: Can't access database in Pages
- Check that D1 binding is configured in Pages settings
- Binding name must be exactly `DB`

## Useful Commands

```bash
# View all tables
npm run db:execute:local -- --command "SELECT name FROM sqlite_master WHERE type='table';"

# Count events
npm run db:execute:local -- --command "SELECT COUNT(*) as count FROM events;"

# View recent events
npm run db:execute:local -- --command "SELECT * FROM events ORDER BY created_at DESC LIMIT 5;"
```

