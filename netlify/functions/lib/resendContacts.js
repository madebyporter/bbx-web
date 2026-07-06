function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return apiKey
}

export function normalizeUserType(userType) {
  return userType === 'audio_pro' ? 'audio_pro' : 'creator'
}

export function resolveSegmentIds(userType) {
  const all = process.env.RESEND_SEGMENT_ID?.trim()
  const creators = process.env.RESEND_SEGMENT_CREATORS_ID?.trim()
  const audioPros = process.env.RESEND_SEGMENT_AUDIO_PROS_ID?.trim()
  const normalized = normalizeUserType(userType)
  const typeSegment = normalized === 'audio_pro' ? audioPros : creators
  const oppositeTypeSegment = normalized === 'audio_pro' ? creators : audioPros
  return { all, typeSegment, oppositeTypeSegment }
}

function contactUrl(email) {
  return `https://api.resend.com/contacts/${encodeURIComponent(email)}`
}

function segmentUrl(email, segmentId) {
  return `${contactUrl(email)}/segments/${segmentId}`
}

async function resendRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return response
}

async function addContactToSegment(email, segmentId) {
  if (!segmentId) return
  const response = await resendRequest(segmentUrl(email, segmentId), { method: 'POST' })
  if (!response.ok && response.status !== 409) {
    const body = await response.text()
    throw new Error(`Resend add segment error (${response.status}): ${body}`)
  }
}

async function removeContactFromSegment(email, segmentId) {
  if (!segmentId) return
  const response = await resendRequest(segmentUrl(email, segmentId), { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    const body = await response.text()
    throw new Error(`Resend remove segment error (${response.status}): ${body}`)
  }
}

async function ensureSegmentMembership(email, userType, previousUserType) {
  const { all, typeSegment, oppositeTypeSegment } = resolveSegmentIds(userType)

  if (all) await addContactToSegment(email, all)
  if (typeSegment) await addContactToSegment(email, typeSegment)
  if (oppositeTypeSegment) await removeContactFromSegment(email, oppositeTypeSegment)

  if (previousUserType && normalizeUserType(previousUserType) !== normalizeUserType(userType)) {
    const previous = resolveSegmentIds(previousUserType)
    if (previous.typeSegment && previous.typeSegment !== typeSegment) {
      await removeContactFromSegment(email, previous.typeSegment)
    }
  }
}

export async function upsertResendContact({
  email,
  firstName,
  userType,
  username,
  supabaseUserId,
  previousUserType,
}) {
  const normalizedType = normalizeUserType(userType)
  const { all, typeSegment } = resolveSegmentIds(normalizedType)

  if (!all || !typeSegment) {
    throw new Error(
      'RESEND_SEGMENT_ID, RESEND_SEGMENT_CREATORS_ID, and RESEND_SEGMENT_AUDIO_PROS_ID must be configured'
    )
  }

  const properties = {
    username: username || '',
    user_type: normalizedType,
    supabase_user_id: supabaseUserId || '',
  }

  const updateBody = {
    first_name: firstName,
    unsubscribed: false,
    properties,
  }

  const updateResponse = await resendRequest(contactUrl(email), {
    method: 'PATCH',
    body: JSON.stringify(updateBody),
  })

  if (updateResponse.ok) {
    await ensureSegmentMembership(email, normalizedType, previousUserType)
    return
  }

  if (updateResponse.status !== 404) {
    const body = await updateResponse.text()
    throw new Error(`Resend update contact error (${updateResponse.status}): ${body}`)
  }

  const createResponse = await resendRequest('https://api.resend.com/contacts', {
    method: 'POST',
    body: JSON.stringify({
      email,
      first_name: firstName,
      unsubscribed: false,
      segments: [{ id: all }, { id: typeSegment }],
      properties,
    }),
  })

  if (createResponse.ok) {
    return
  }

  if (createResponse.status === 409 || createResponse.status === 422) {
    const retryResponse = await resendRequest(contactUrl(email), {
      method: 'PATCH',
      body: JSON.stringify(updateBody),
    })
    if (!retryResponse.ok) {
      const body = await retryResponse.text()
      throw new Error(`Resend update contact error (${retryResponse.status}): ${body}`)
    }
    await ensureSegmentMembership(email, normalizedType, previousUserType)
    return
  }

  const body = await createResponse.text()
  throw new Error(`Resend create contact error (${createResponse.status}): ${body}`)
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
