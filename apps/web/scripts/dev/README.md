# Dev Seed Script

This script seeds the database with development data for testing and development purposes.

### How to Run

**Basic seeding (adds data without deleting existing data):**

```bash
cd apps/web
pnpm run script dev/seed
```

**Truncate database before seeding (deletes all existing data first):**

```bash
cd apps/web
pnpm run script dev/seed --truncate
```

When using `--truncate`, the script will ask for confirmation before deleting any data.
