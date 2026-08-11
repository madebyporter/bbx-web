export default defineEventHandler(() => {
  return {
    status: 'ok',
    service: 'beatbox',
    timestamp: new Date().toISOString(),
  }
})
