import type posthog from 'posthog-js'

declare module '#app' {
  interface NuxtApp {
    $posthog: typeof posthog
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $posthog: typeof posthog
  }
}

export {}
