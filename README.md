This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create `.env.local` with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI (for meeting record auto-summarization)
GOOGLE_AI_API_KEY=your-gemini-api-key
```

### Run Development Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Database Schema

The `meeting_records` table requires the following columns (see `database-schema.sql`):

```sql
CREATE TABLE meeting_records (
  id BIGSERIAL PRIMARY KEY,
  meeting_date DATE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false,
  tags TEXT[]
);
```

If your table already exists, run these `ALTER` statements in Supabase SQL Editor:

```sql
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE meeting_records ADD COLUMN IF NOT EXISTS tags TEXT[];
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
