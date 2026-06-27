import { ref } from 'vue'

export type ToastType = 'processing' | 'error' | 'success' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number // Duration in ms, 0 for persistent
}

const toasts = ref<Toast[]>([])
let toastIdCounter = 0

export const useToast = () => {
  const addToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`
    const toast: Toast = {
      id,
      message,
      type,
      duration
    }
    
    toasts.value.push(toast)
    
    // Auto-remove toast after duration (unless duration is 0 for persistent)
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const updateToast = (id: string, message: string, type?: ToastType) => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast) {
      toast.message = message
      if (type) {
        toast.type = type
      }
    }
  }
  
  // Convenience methods
  const showProcessing = (message: string, persistent: boolean = false) => {
    return addToast(message, 'processing', persistent ? 0 : 0) // Processing toasts are persistent by default
  }
  
  const showError = (message: string, duration: number = 5000) => {
    return addToast(message, 'error', duration)
  }
  
  const showSuccess = (message: string, duration: number = 3000) => {
    return addToast(message, 'success', duration)
  }
  
  const showInfo = (message: string, duration: number = 3000) => {
    return addToast(message, 'info', duration)
  }
  
  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    showProcessing,
    showError,
    showSuccess,
    showInfo
  }
}
