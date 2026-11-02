/**
 * Grant launch grace comps to existing users.
 * Dry-run by default.
 *
 *   npx tsx scripts/grant-launch-grace.ts
 *   npx tsx scripts/grant-launch-grace.ts --write
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const write = process.argv.includes('--write')
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NUXT_SUPABASE_SERVICE_KEY ||
  process.env.NUXT_PUBLIC_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listAllUsers() {
  const users: Array<{ id: string; email?: string; created_at: string }> = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const batch = data?.users || []
    if (!batch.length) break
    for (const u of batch) {
      users.push({ id: u.id, email: u.email, created_at: u.created_at })
    }
    if (batch.length < 200) break
    page++
  }
  return users
}

async function main() {
  console.log(write ? 'WRITE mode' : 'DRY RUN (pass --write to apply)')

  const { data: settings, error: settingsError } = await supabase
    .from('billing_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (settingsError || !settings) {
    throw new Error(settingsError?.message || 'billing_settings row missing. Apply the billing migration first.')
  }
  if (!settings.grace_enabled) {
    console.log('Grace is disabled in billing_settings. Nothing to do.')
    return
  }
  if (!settings.grace_applies_to_users_created_before) {
    console.error('Set grace_applies_to_users_created_before in admin before running this script.')
    process.exit(1)
  }

  const { data: gracePlan } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', settings.grace_plan_slug || 'pro')
    .maybeSingle()

  if (!gracePlan) {
    throw new Error(`Grace plan slug not found: ${settings.grace_plan_slug}`)
  }

  const cutoff = new Date(settings.grace_applies_to_users_created_before)
  const until = new Date(Date.now() + Number(settings.grace_days || 60) * 24 * 60 * 60 * 1000).toISOString()
  const users = await listAllUsers()
  const eligible = users.filter((u) => new Date(u.created_at) < cutoff)

  console.log(`Cutoff: ${cutoff.toISOString()}`)
  console.log(`Comp until: ${until}`)
  console.log(`Eligible users (created before cutoff): ${eligible.length}`)

  const overStorage: string[] = []
  let granted = 0
  let skippedPaid = 0

  for (const user of eligible) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const paid =
      sub &&
      sub.stripe_subscription_id &&
      ['active', 'trialing', 'past_due'].includes(sub.status)

    if (paid) {
      console.log(`SKIP paid ${user.email || user.id}`)
      skippedPaid++
      continue
    }

    const { data: usage } = await supabase.rpc('get_user_usage', { p_user_id: user.id })
    const row = Array.isArray(usage) ? usage[0] : usage
    const storageBytes = Number(row?.storage_bytes || 0)
    if (
      gracePlan.storage_limit_bytes != null &&
      storageBytes > Number(gracePlan.storage_limit_bytes)
    ) {
      overStorage.push(`${user.email || user.id} (${storageBytes} bytes)`)
    }

    console.log(`GRANT ${user.email || user.id} -> ${gracePlan.slug} until ${until}`)
    if (write) {
      const { error } = await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          status: 'comped',
          plan_id: sub?.plan_id || gracePlan.id,
          stripe_customer_id: sub?.stripe_customer_id || null,
          stripe_subscription_id: sub?.stripe_subscription_id || null,
          comp_plan_id: gracePlan.id,
          comp_until: until,
          comp_reason: 'launch_grace',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        console.error(`  failed: ${error.message}`)
        continue
      }
      granted++
    }
  }

  console.log(`\nDone. ${write ? `Granted ${granted}.` : 'No writes.'} Skipped paid: ${skippedPaid}.`)
  if (overStorage.length) {
    console.log('\nUsers already over Pro storage backstop (review manually):')
    for (const line of overStorage) console.log(`  - ${line}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
