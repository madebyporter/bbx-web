<template>
  <Teleport to="body">
    <aside 
      v-if="show" 
      ref="modal"
      class="modal"
      style="transform: translateX(100%)"
    >
      <div 
        @click="close" 
        class="flex justify-center items-center border border-stone-800 hover:border-stone-700 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-stone-700" />
      </div>

      <h2 class="text-2xl font-bold">Manage Submissions</h2>

      <div class="pt-8 flex flex-col gap-8">
        <!-- Pending Submissions -->
        <div class="flex flex-col gap-4">
          <h3 class="text-lg font-medium">Pending Submissions</h3>
          <div v-if="pendingResources.length === 0" class="text-neutral-500">
            No pending submissions
          </div>
          <div v-else class="flex flex-col gap-2">
            <div v-for="resource in pendingResources" :key="resource.id" 
              class="flex flex-col gap-4 p-4 bg-neutral-100 rounded-md">
              <div class="flex flex-row justify-between items-center">
                <div class="flex flex-col">
                  <span class="font-medium">{{ resource.name }}</span>
                  <span class="text-sm text-neutral-500">by {{ resource.creator }}</span>
                </div>
                <div class="flex flex-row gap-2">
                  <button 
                    @click="approveResource(resource)"
                    class="px-4 py-2 bg-emerald-300 text-emerald-900 rounded-md hover:bg-emerald-400 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button 
                    @click="rejectResource(resource)"
                    class="px-4 py-2 bg-rose-300 text-rose-900 rounded-md hover:bg-rose-400 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <!-- Show duplicates if any exist -->
              <div v-if="resource.duplicates?.length > 0" class="mt-2">
                <div class="text-sm font-medium text-amber-600">Possible duplicates found:</div>
                <div class="mt-1 space-y-2">
                  <div 
                    v-for="duplicate in resource.duplicates" 
                    :key="duplicate.id"
                    class="flex flex-col p-2 bg-stone-900 rounded border border-amber-200"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium">{{ duplicate.name }}</span>
                        <span class="text-sm text-neutral-500">&nbsp;by {{ duplicate.creator }}</span>
                      </div>
                      <span class="text-xs text-amber-600">
                        Duplicate {{ getDuplicateType(resource, duplicate) }}
                      </span>
                    </div>
                    <div class="text-sm text-neutral-600 mt-1">
                      Status: {{ duplicate.status || 'approved' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="flex flex-col gap-4">
          <h3 class="text-lg font-medium">Recent Activity</h3>
          <div class="flex flex-col gap-2">
            <div v-for="(activity, index) in recentActivity" :key="index"
              class="flex flex-row justify-between items-center p-4 bg-neutral-100 rounded-md">
              <div class="flex flex-col">
                <span class="font-medium">{{ activity.resource_name }}</span>
                <span class="text-sm text-neutral-500">
                  {{ activity.action }} by {{ activity.user }} on {{ formatDate(activity.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<script>
import gsap from 'gsap'
import { useSupabase } from '../utils/supabase'

export default {
  emits: ['close', 'resource-updated'],
  setup() {
    const { supabase } = useSupabase()
    return {
      supabase
    }
  },
  props: {
    show: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      pendingResources: [],
      recentActivity: []
    }
  },
  watch: {
    show(newValue) {
      if (newValue) {
        this.$nextTick(() => {
          this.animateIn()
        })
      } else {
        this.animateOut()
      }
    }
  },
  methods: {
    animateIn() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: 0,
        ease: 'power2.out'
      })
    },
    animateOut() {
      gsap.to(this.$refs.modal, {
        duration: 0.3,
        x: '100%',
        ease: 'power2.in',
        onComplete: () => {
          this.$emit('close')
        }
      })
    },
    close() {
      this.animateOut()
    },
    async fetchPendingResources() {
      try {
        // First, get pending resources with their creators
        const { data: pendingData, error: pendingError } = await this.supabase
          .from('resources')
          .select(`
            *,
            creators (
              name
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (pendingError) throw pendingError

        // For each pending resource, check for duplicates
        const pendingWithDuplicates = await Promise.all(pendingData.map(async (resource) => {
          // Check for resources with same name or link (excluding the current pending one)
          const { data: duplicates, error: dupError } = await this.supabase
            .from('resources')
            .select(`
              *,
              creators (
                name
              )
            `)
            .or(`name.ilike.${resource.name},link.eq.${resource.link}`)
            .neq('id', resource.id)
            .neq('status', 'rejected')

          if (dupError) throw dupError

          return {
            ...resource,
            creator: resource.creators?.name || 'Unknown',
            duplicates: duplicates.map(dup => ({
              ...dup,
              creator: dup.creators?.name || 'Unknown'
            }))
          }
        }))

        this.pendingResources = pendingWithDuplicates
      } catch (error) {
        console.error('Error fetching pending resources:', error)
      }
    },
    async fetchRecentActivity() {
      try {
        const { data, error } = await this.supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        this.recentActivity = data
      } catch (error) {
        console.error('Error fetching recent activity:', error)
      }
    },
    async approveResource(resource) {
      try {
        const { error } = await this.supabase
          .from('resources')
          .update({ status: 'approved' })
          .eq('id', resource.id)

        if (error) throw error

        await this.logActivity(resource, 'approved')
        await this.fetchPendingResources()
        await this.fetchRecentActivity()
        this.$emit('resource-updated')
      } catch (error) {
        console.error('Error approving resource:', error)
      }
    },
    async rejectResource(resource) {
      try {
        const { error } = await this.supabase
          .from('resources')
          .update({ status: 'rejected' })
          .eq('id', resource.id)

        if (error) throw error

        await this.logActivity(resource, 'rejected')
        await this.fetchPendingResources()
        await this.fetchRecentActivity()
        this.$emit('resource-updated')
      } catch (error) {
        console.error('Error rejecting resource:', error)
      }
    },
    async logActivity(resource, action) {
      try {
        const { error } = await this.supabase
          .from('activity_log')
          .insert({
            resource_id: resource.id,
            resource_name: resource.name,
            action,
            user: 'Admin',
            date: new Date().toISOString()
          })

        if (error) throw error
      } catch (error) {
        console.error('Error logging activity:', error)
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    getDuplicateType(original, duplicate) {
      if (original.name.toLowerCase() === duplicate.name.toLowerCase()) {
        return 'name'
      }
      if (original.link === duplicate.link) {
        return 'link'
      }
      return 'unknown'
    }
  },
  mounted() {
    this.fetchPendingResources()
    this.fetchRecentActivity()
    if (this.show) {
      this.$nextTick(() => {
        this.animateIn()
      })
    }
  }
}
</script> 