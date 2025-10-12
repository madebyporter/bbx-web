# Scripts

This directory contains utility scripts for database maintenance and one-time operations.

## Track Groups Backfill

### What it does

The `backfill-track-groups.ts` script populates the `track_group_name` field for all existing tracks in the database. It:

1. Fetches all tracks where `track_group_name` is `NULL`
2. Uses fuzzy matching to detect similar tracks (strips BPM, version numbers)
3. Groups similar tracks together with the same `track_group_name`
4. Updates each track in the database

### Prerequisites

1. **Run the database migration first:**
   ```sql
   -- In Supabase Dashboard SQL Editor, run:
   ALTER TABLE public.sounds 
   ADD COLUMN IF NOT EXISTS track_group_name TEXT;

   CREATE INDEX IF NOT EXISTS idx_sounds_track_group_name 
     ON public.sounds(user_id, track_group_name);
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Make sure your `.env` file has:
   ```env
   NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NUXT_PUBLIC_SERVICE_ROLE=your_service_role_key
   ```

   ⚠️ **Important:** You need the **service role key** (not the anon key) for this script to work with admin privileges.

### How to run

```bash
npm run backfill:track-groups
```

Or directly with tsx:

```bash
npx tsx scripts/backfill-track-groups.ts
```

### Output

The script will show progress like this:

```
🚀 Starting track groups backfill...

📊 Found 12 tracks without track_group_name

👤 Processing tracks for user: 628682fd-5f62-42bc-a5fe-bf6e80f9e188
  ✓ Track #1: "Art Dealer - BPM150 - v2" → group: "art-dealer"
  ✓ Track #2: "Art Dealer Dark Remix" → group: "art-dealer-dark-remix"
  ✓ Track #3: "Art Dealer - BPM140 - v3" → group: "art-dealer"
  ✓ Track #4: "Solo Journey - BPM138 - v1.2" → group: "solo-journey"

============================================================
✅ Backfill complete!
   Successfully processed: 12
   Errors: 0
============================================================

🎉 Script finished successfully
```

### What it does NOT do

- Does not modify existing `track_group_name` values (only processes NULL values)
- Does not change track titles, versions, or any other metadata
- Does not affect collections or other relationships

### Safety

This script is safe to run multiple times. It only processes tracks where `track_group_name` is `NULL`, so running it again will only process new tracks uploaded since the last run.

### Troubleshooting

**Error: Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SERVICE_ROLE**
- Make sure your `.env` file exists and has the correct keys
- The service role key is needed (found in Supabase Dashboard → Settings → API)

**Error: Failed to fetch tracks**
- Check your Supabase connection
- Verify the `sounds` table exists and has the `track_group_name` column

**Script finds 0 tracks**
- All tracks already have `track_group_name` set
- No action needed!

