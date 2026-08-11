#!/usr/bin/env node
/**
 * Publish DNS for AI Discovery (DNS-AID) HTTPS records for beatbox.studio.
 *
 * Requires:
 *   CLOUDFLARE_API_TOKEN  — Zone:DNS:Edit (+ Zone:DNSSEC:Edit to enable DNSSEC)
 *   CLOUDFLARE_ZONE_ID    — optional; looked up from zone name when omitted
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/publish-dns-aid.mjs
 */

const ZONE_NAME = process.env.DNS_AID_ZONE || 'beatbox.studio'
const TARGET = process.env.DNS_AID_TARGET || 'beatbox.studio'
const TTL = Number(process.env.DNS_AID_TTL || 3600)
const API = 'https://api.cloudflare.com/client/v4'
const TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim()

/** @type {Array<{ name: string, value: string, comment: string }>} */
const RECORDS = [
  {
    name: `_index._agents.${ZONE_NAME}`,
    value: 'alpn="h3,h2" port=443',
    comment: 'DNS-AID index entrypoint',
  },
  {
    name: `_a2a._agents.${ZONE_NAME}`,
    value: 'alpn="h3,h2" port=443',
    comment: 'DNS-AID A2A entrypoint (Agent Card at /.well-known/agent-card.json)',
  },
]

if (!TOKEN) {
  console.error('Missing CLOUDFLARE_API_TOKEN')
  console.error('Create a token with Zone DNS Edit for', ZONE_NAME)
  process.exit(1)
}

async function cf(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) {
    const err = json.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') || res.statusText
    throw new Error(`${method} ${path} failed: ${err}`)
  }
  return json.result
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID?.trim()) return process.env.CLOUDFLARE_ZONE_ID.trim()
  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`)
  const zone = zones[0]
  if (!zone?.id) throw new Error(`Zone not found: ${ZONE_NAME}`)
  return zone.id
}

async function upsertHttpsRecord(zoneId, { name, value, comment }) {
  const existing = await cf(
    `/zones/${zoneId}/dns_records?type=HTTPS&name=${encodeURIComponent(name)}`,
  )
  const payload = {
    type: 'HTTPS',
    name,
    ttl: TTL,
    comment,
    data: {
      priority: 1,
      target: TARGET,
      value,
    },
  }

  if (existing[0]?.id) {
    const updated = await cf(`/zones/${zoneId}/dns_records/${existing[0].id}`, {
      method: 'PUT',
      body: payload,
    })
    console.log('updated', name, '→', updated.content || value)
    return updated
  }

  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: payload,
  })
  console.log('created', name, '→', created.content || value)
  return created
}

async function ensureDnssec(zoneId) {
  try {
    const status = await cf(`/zones/${zoneId}/dnssec`)
    if (status?.status === 'active' || status?.status === 'pending') {
      console.log('DNSSEC already', status.status)
      if (status.ds) console.log('DS record (publish at registrar if needed):\n', status.ds)
      return status
    }
  } catch {
    // continue to enable
  }

  try {
    const enabled = await cf(`/zones/${zoneId}/dnssec`, {
      method: 'PATCH',
      body: { status: 'active' },
    })
    console.log('DNSSEC enable requested:', enabled?.status || 'ok')
    if (enabled?.ds) {
      console.log('DS record — add at your registrar to complete the chain of trust:\n', enabled.ds)
    }
    return enabled
  } catch (error) {
    console.warn('Could not enable DNSSEC via API:', error.message)
    console.warn('Enable DNSSEC in Cloudflare dashboard → DNS → Settings, then add the DS at the registrar.')
    return null
  }
}

async function main() {
  const zoneId = await resolveZoneId()
  console.log('zone', ZONE_NAME, zoneId)

  for (const record of RECORDS) {
    await upsertHttpsRecord(zoneId, record)
  }

  await ensureDnssec(zoneId)

  console.log('\nVerify with:')
  console.log(`  dig +short HTTPS _index._agents.${ZONE_NAME}`)
  console.log(`  dig +short HTTPS _a2a._agents.${ZONE_NAME}`)
  console.log(`  dig +dnssec HTTPS _index._agents.${ZONE_NAME}`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
