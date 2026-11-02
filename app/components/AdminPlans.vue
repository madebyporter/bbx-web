<template>
  <div class="space-y-10">
    <div>
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 class="text-xl font-semibold">Plans and billing</h2>
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" :disabled="busy" @click="updatePortal">
            Update Customer Portal
          </Button>
          <Button variant="primary" size="sm" @click="startCreate">Add plan</Button>
        </div>
      </div>

      <p v-if="message" class="text-sm text-amber-400 mb-4">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-400 mb-4">{{ error }}</p>

      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="border border-neutral-800 rounded-lg p-4 space-y-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold">{{ plan.name }}</h3>
                <span class="text-neutral-500 text-sm">{{ plan.slug }}</span>
                <span v-if="plan.is_default" class="text-xs px-2 py-0.5 rounded bg-neutral-800">Default</span>
                <span v-if="!plan.is_public" class="text-xs px-2 py-0.5 rounded bg-neutral-800">Hidden</span>
                <span v-if="!plan.is_active" class="text-xs px-2 py-0.5 rounded bg-neutral-800">Inactive</span>
                <span v-if="plan.badge" class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">{{ plan.badge }}</span>
              </div>
              <p class="text-sm text-neutral-400 mt-1">
                {{ formatMoney(plan.price_monthly_cents) }}/mo
                <template v-if="plan.price_annual_cents != null">
                  · {{ formatMoney(plan.price_annual_cents) }}/yr
                </template>
              </p>
              <p class="text-sm text-neutral-400">
                Tracks: {{ plan.track_limit == null ? 'Unlimited' : plan.track_limit }}
                · Storage: {{ formatBytes(plan.storage_limit_bytes) }}
                · Max file: {{ formatBytes(plan.max_file_size_bytes) }}
              </p>
              <p class="text-xs text-neutral-500 mt-1">
                Stripe:
                {{ plan.stripe_product_id ? 'synced' : 'not synced' }}
                <template v-if="plan.stripe_price_monthly_id"> · monthly price set</template>
              </p>
              <p class="text-xs text-neutral-500">
                Entitlements:
                {{ Object.entries(plan.entitlements || {}).map(([k, v]) => `${k}:${v}`).join(', ') || 'none' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" @click="editPlan(plan)">Edit</Button>
              <Button
                v-if="!plan.is_default"
                variant="secondary"
                size="sm"
                :disabled="busy"
                @click="syncStripe(plan.id)"
              >
                Sync to Stripe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit / create form -->
    <div v-if="editing" class="border border-neutral-800 rounded-lg p-4 space-y-4">
      <h3 class="text-lg font-semibold">{{ editing.id ? 'Edit plan' : 'New plan' }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="block text-sm">
          <span class="text-neutral-400">Slug</span>
          <input v-model="editing.slug" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Name</span>
          <input v-model="editing.name" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm md:col-span-2">
          <span class="text-neutral-400">Description</span>
          <input v-model="editing.description" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Monthly price (cents)</span>
          <input v-model.number="editing.price_monthly_cents" type="number" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Annual price (cents, blank = none)</span>
          <input v-model="annualCentsInput" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Track limit</span>
          <input v-model.number="trackLimitInput" type="number" :disabled="tracksUnlimited" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
          <label class="mt-1 flex items-center gap-2 text-neutral-400">
            <input v-model="tracksUnlimited" type="checkbox" /> Unlimited
          </label>
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Storage limit</span>
          <div class="mt-1 flex gap-2">
            <input v-model.number="storageAmount" type="number" :disabled="storageUnlimited" class="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <select v-model="storageUnit" :disabled="storageUnlimited" class="bg-neutral-900 border border-neutral-700 rounded px-2">
              <option value="MB">MB</option>
              <option value="GB">GB</option>
            </select>
          </div>
          <label class="mt-1 flex items-center gap-2 text-neutral-400">
            <input v-model="storageUnlimited" type="checkbox" /> Unlimited
          </label>
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Max file size (MB, blank = 50)</span>
          <input v-model.number="maxFileMb" type="number" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Sort order</span>
          <input v-model.number="editing.sort_order" type="number" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Badge</span>
          <input v-model="editing.badge" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm md:col-span-2">
          <span class="text-neutral-400">Features (one per line)</span>
          <textarea v-model="featuresText" rows="3" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-neutral-400">Entitlements</p>
        <label
          v-for="(value, key) in editing.entitlements"
          :key="key"
          class="flex items-center gap-2 text-sm"
        >
          <input type="checkbox" :checked="value === true" @change="editing.entitlements[key] = ($event.target as HTMLInputElement).checked" />
          {{ key }}
        </label>
        <div class="flex gap-2">
          <input v-model="newEntitlementKey" placeholder="add key" class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
          <Button variant="secondary" size="sm" @click="addEntitlementKey">Add key</Button>
        </div>
      </div>

      <div class="flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="editing.is_active" type="checkbox" /> Active</label>
        <label class="flex items-center gap-2"><input v-model="editing.is_public" type="checkbox" /> Public</label>
        <label class="flex items-center gap-2"><input v-model="editing.is_default" type="checkbox" /> Default (must be free)</label>
      </div>

      <p class="text-xs text-neutral-500">
        Changing a Stripe price amount creates a new price and archives the old one. Existing subscribers keep the old price until they change plans.
      </p>

      <div class="flex gap-2">
        <Button variant="primary" :disabled="busy" @click="savePlan">Save</Button>
        <Button variant="ghost" @click="editing = null">Cancel</Button>
      </div>
    </div>

    <!-- Billing settings -->
    <div class="border border-neutral-800 rounded-lg p-4 space-y-4">
      <h3 class="text-lg font-semibold">Billing settings</h3>
      <div v-if="settings" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="block text-sm">
          <span class="text-neutral-400">Grace plan slug</span>
          <input v-model="settings.grace_plan_slug" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Grace days</span>
          <input v-model.number="settings.grace_days" type="number" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Grace applies to users created before</span>
          <input v-model="graceCutoffLocal" type="datetime-local" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-neutral-400">Past due grace days</span>
          <input v-model.number="settings.past_due_grace_days" type="number" class="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.grace_enabled" type="checkbox" /> Grace enabled
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input :checked="settings.enforcement_enabled" type="checkbox" @change="onEnforcementToggle" />
          Enforcement enabled
        </label>
      </div>
      <Button variant="secondary" size="sm" :disabled="busy" @click="saveSettings">Save settings</Button>
    </div>

    <!-- Comp user -->
    <div class="border border-neutral-800 rounded-lg p-4 space-y-4">
      <h3 class="text-lg font-semibold">Comp a user</h3>
      <div class="flex flex-wrap gap-2">
        <input v-model="lookupQuery" placeholder="email or username" class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <Button variant="secondary" size="sm" @click="lookupUser">Lookup</Button>
      </div>
      <ul v-if="lookupResults.length" class="space-y-2 text-sm">
        <li v-for="row in lookupResults" :key="row.id" class="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 rounded p-2">
          <span>{{ row.label }}</span>
          <Button variant="ghost" size="sm" @click="selectedUserId = row.id">Select</Button>
        </li>
      </ul>
      <div v-if="selectedUserId" class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select v-model="compPlanSlug" class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
          <option v-for="p in plans" :key="p.id" :value="p.slug">{{ p.name }}</option>
        </select>
        <input v-model="compUntilLocal" type="datetime-local" class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
        <input v-model="compReason" placeholder="reason" class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
      </div>
      <div v-if="selectedUserId" class="flex gap-2">
        <Button variant="primary" size="sm" :disabled="busy" @click="applyComp">Apply comp</Button>
        <Button variant="danger" size="sm" :disabled="busy" @click="removeComp">Remove comp</Button>
      </div>
    </div>

    <ConfirmDialog
      v-model:show="confirmEnforcement.show"
      :title="confirmEnforcement.next ? 'Enable enforcement?' : 'Disable enforcement?'"
      :message="confirmEnforcement.next
        ? 'Uploads that exceed plan limits will be blocked. Make sure meters and grace are ready.'
        : 'Caps will still be shown, but uploads will not be blocked.'"
      confirm-text="Confirm"
      @confirm="confirmEnforcementChange"
      @cancel="confirmEnforcement.show = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'

const props = defineProps<{ active: boolean }>()

const plans = ref<any[]>([])
const settings = ref<any | null>(null)
const loading = ref(false)
const busy = ref(false)
const message = ref('')
const error = ref('')
const editing = ref<any | null>(null)

const tracksUnlimited = ref(false)
const trackLimitInput = ref<number | null>(5)
const storageUnlimited = ref(false)
const storageAmount = ref(500)
const storageUnit = ref<'MB' | 'GB'>('MB')
const maxFileMb = ref(50)
const featuresText = ref('')
const annualCentsInput = ref('')
const newEntitlementKey = ref('')

const confirmEnforcement = reactive({ show: false, next: false })

const lookupQuery = ref('')
const lookupResults = ref<Array<{ id: string; label: string }>>([])
const selectedUserId = ref('')
const compPlanSlug = ref('pro')
const compUntilLocal = ref('')
const compReason = ref('')

const graceCutoffLocal = computed({
  get() {
    if (!settings.value?.grace_applies_to_users_created_before) return ''
    return toLocalInput(settings.value.grace_applies_to_users_created_before)
  },
  set(v: string) {
    if (!settings.value) return
    settings.value.grace_applies_to_users_created_before = v ? new Date(v).toISOString() : null
  },
})

function formatMoney(cents: number) {
  return `$${(Number(cents || 0) / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return 'Unlimited'
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(bytes % 1073741824 === 0 ? 0 : 1)} GB`
  return `${Math.round(bytes / 1048576)} MB`
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function api<T>(url: string, options: any = {}): Promise<T> {
  const headers = await useAuthHeaders()
  const result = await $fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  return result as T
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [plansRes, settingsRes] = await Promise.all([
      api<{ plans: any[] }>('/api/admin/plans'),
      api<{ settings: any }>('/api/admin/billing-settings'),
    ])
    plans.value = plansRes.plans || []
    settings.value = settingsRes.settings
    if (!compPlanSlug.value && plans.value[0]) compPlanSlug.value = plans.value[0].slug
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Failed to load admin billing'
  } finally {
    loading.value = false
  }
}

function startCreate() {
  editing.value = {
    slug: '',
    name: '',
    description: '',
    price_monthly_cents: 0,
    price_annual_cents: null,
    currency: 'usd',
    track_limit: 5,
    storage_limit_bytes: 524288000,
    max_file_size_bytes: 52428800,
    features: [],
    entitlements: { track_sync: false },
    is_default: false,
    is_active: true,
    is_public: true,
    sort_order: plans.value.length,
    badge: '',
  }
  tracksUnlimited.value = false
  trackLimitInput.value = 5
  storageUnlimited.value = false
  storageAmount.value = 500
  storageUnit.value = 'MB'
  maxFileMb.value = 50
  featuresText.value = ''
  annualCentsInput.value = ''
}

function editPlan(plan: any) {
  editing.value = {
    ...plan,
    entitlements: { ...(plan.entitlements || {}) },
    features: [...(plan.features || [])],
  }
  tracksUnlimited.value = plan.track_limit == null
  trackLimitInput.value = plan.track_limit
  storageUnlimited.value = plan.storage_limit_bytes == null
  if (plan.storage_limit_bytes != null && plan.storage_limit_bytes >= 1073741824) {
    storageUnit.value = 'GB'
    storageAmount.value = plan.storage_limit_bytes / 1073741824
  } else {
    storageUnit.value = 'MB'
    storageAmount.value = plan.storage_limit_bytes == null ? 500 : plan.storage_limit_bytes / 1048576
  }
  maxFileMb.value = plan.max_file_size_bytes == null ? 50 : plan.max_file_size_bytes / 1048576
  featuresText.value = (plan.features || []).join('\n')
  annualCentsInput.value = plan.price_annual_cents == null ? '' : String(plan.price_annual_cents)
}

function addEntitlementKey() {
  const key = newEntitlementKey.value.trim()
  if (!key || !editing.value) return
  editing.value.entitlements[key] = false
  newEntitlementKey.value = ''
}

function buildPayload() {
  if (!editing.value) return null
  const storageBytes = storageUnlimited.value
    ? null
    : Math.round(storageAmount.value * (storageUnit.value === 'GB' ? 1073741824 : 1048576))
  return {
    ...editing.value,
    slug: editing.value.slug.trim().toLowerCase(),
    price_annual_cents: annualCentsInput.value === '' ? null : Number(annualCentsInput.value),
    track_limit: tracksUnlimited.value ? null : Number(trackLimitInput.value),
    storage_limit_bytes: storageBytes,
    max_file_size_bytes: maxFileMb.value ? Math.round(maxFileMb.value * 1048576) : null,
    features: featuresText.value.split('\n').map((s) => s.trim()).filter(Boolean),
  }
}

async function savePlan() {
  const payload = buildPayload()
  if (!payload) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (payload.id) {
      await api(`/api/admin/plans/${payload.id}`, { method: 'PATCH', body: payload })
    } else {
      await api('/api/admin/plans', { method: 'POST', body: payload })
    }
    editing.value = null
    message.value = 'Plan saved'
    await loadAll()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Save failed'
  } finally {
    busy.value = false
  }
}

async function syncStripe(id: string) {
  busy.value = true
  error.value = ''
  try {
    const res = await api<{ note?: string; skipped?: boolean; reason?: string }>(
      `/api/admin/plans/${id}/sync-stripe`,
      { method: 'POST' },
    )
    message.value = res.skipped ? res.reason || 'Skipped' : res.note || 'Synced to Stripe'
    await loadAll()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Stripe sync failed'
  } finally {
    busy.value = false
  }
}

async function updatePortal() {
  busy.value = true
  error.value = ''
  try {
    const res = await api<{ configurationId: string; message: string }>(
      '/api/admin/stripe/portal-config',
      { method: 'POST' },
    )
    message.value = `${res.message} ID: ${res.configurationId}`
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Portal update failed'
  } finally {
    busy.value = false
  }
}

function onEnforcementToggle(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  confirmEnforcement.next = checked
  confirmEnforcement.show = true
  ;(e.target as HTMLInputElement).checked = settings.value?.enforcement_enabled
}

async function confirmEnforcementChange() {
  confirmEnforcement.show = false
  if (!settings.value) return
  settings.value.enforcement_enabled = confirmEnforcement.next
  await saveSettings()
}

async function saveSettings() {
  if (!settings.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await api<{ settings: any }>('/api/admin/billing-settings', {
      method: 'PATCH',
      body: settings.value,
    })
    settings.value = res.settings
    message.value = 'Settings saved'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Settings save failed'
  } finally {
    busy.value = false
  }
}

async function lookupUser() {
  error.value = ''
  try {
    const res = await api<{ profiles: any[]; users: any[] }>(
      `/api/admin/users/lookup?q=${encodeURIComponent(lookupQuery.value)}`,
    )
    const rows: Array<{ id: string; label: string }> = []
    for (const p of res.profiles || []) {
      rows.push({ id: p.id, label: `${p.display_name || p.username || p.id} (${p.username || 'no username'})` })
    }
    for (const u of res.users || []) {
      if (!rows.find((r) => r.id === u.id)) {
        rows.push({ id: u.id, label: u.email || u.id })
      }
    }
    lookupResults.value = rows
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Lookup failed'
  }
}

async function applyComp() {
  if (!selectedUserId.value || !compUntilLocal.value) return
  busy.value = true
  try {
    await api(`/api/admin/users/${selectedUserId.value}/comp`, {
      method: 'POST',
      body: {
        planSlug: compPlanSlug.value,
        until: new Date(compUntilLocal.value).toISOString(),
        reason: compReason.value || null,
      },
    })
    message.value = 'Comp applied'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Comp failed'
  } finally {
    busy.value = false
  }
}

async function removeComp() {
  if (!selectedUserId.value) return
  busy.value = true
  try {
    await api(`/api/admin/users/${selectedUserId.value}/comp`, { method: 'DELETE' })
    message.value = 'Comp removed'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Remove comp failed'
  } finally {
    busy.value = false
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) loadAll()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.active) loadAll()
})
</script>
