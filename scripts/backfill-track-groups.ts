/**
 * One-time script to backfill track_group_name for existing tracks
 * Run with: npx tsx scripts/backfill-track-groups.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { findOrCreateTrackGroup } from '../app/utils/trackGroups'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NUXT_PUBLIC_SERVICE_ROLE // Use service role for admin access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SERVICE_ROLE in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function backfillTrackGroups() {
  console.log('🚀 Starting track groups backfill...\n')

  try {
    // Fetch all tracks without track_group_name
    const { data: tracksWithoutGroup, error: fetchError } = await supabase
      .from('sounds')
      .select('id, user_id, title')
      .is('track_group_name', null)
      .order('user_id', { ascending: true })
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch tracks: ${fetchError.message}`)
    }

    if (!tracksWithoutGroup || tracksWithoutGroup.length === 0) {
      console.log('✅ No tracks need backfilling. All tracks have track_group_name set.')
      return
    }

    console.log(`📊 Found ${tracksWithoutGroup.length} tracks without track_group_name\n`)

    let successCount = 0
    let errorCount = 0
    let currentUserId: string | null = null

    for (const track of tracksWithoutGroup) {
      try {
        // Log when processing a new user
        if (track.user_id !== currentUserId) {
          if (currentUserId) console.log('') // Add spacing between users
          currentUserId = track.user_id
          console.log(`👤 Processing tracks for user: ${track.user_id}`)
        }

        // Generate track group using fuzzy matching
        const trackGroupName = await findOrCreateTrackGroup(
          supabase,
          track.user_id,
          track.title || 'Untitled'
        )

        // Update the track
        const { error: updateError } = await supabase
          .from('sounds')
          .update({ track_group_name: trackGroupName })
          .eq('id', track.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        console.log(`  ✓ Track #${track.id}: "${track.title}" → group: "${trackGroupName}"`)
        successCount++

      } catch (err: any) {
        console.error(`  ✗ Track #${track.id}: ${err.message}`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Backfill complete!`)
    console.log(`   Successfully processed: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the script
backfillTrackGroups()
  .then(() => {
    console.log('\n🎉 Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

