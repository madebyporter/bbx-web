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
        class="flex justify-center items-center bg-neutral-800 hover:bg-neutral-900 p-4 w-fit rounded-md cursor-pointer fixed top-8 right-9"
      >
        <img src="/img/db/icon-close.svg" alt="Close" class="size-4 fill-white" />
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
              class="flex flex-row justify-between items-center p-4 bg-neutral-100 rounded-md">
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
        const { data, error } = await this.supabase
          .from('resources')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) throw error
        this.pendingResources = data
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