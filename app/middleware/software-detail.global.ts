export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path.startsWith('/software/') && to.path !== '/software') {
    console.log('[middleware] Software detail route:', {
      from: from.path,
      to: to.path,
      params: to.params,
      matched: to.matched.map(m => m.path),
      name: to.name
    })
    
    // Check if the route is being matched correctly
    if (!to.name || !to.name.toString().includes('slug')) {
      console.warn('[middleware] WARNING: Route might not be matched correctly!', {
        routeName: to.name,
        path: to.path,
        expected: 'software-slug'
      })
    }
  }
})

