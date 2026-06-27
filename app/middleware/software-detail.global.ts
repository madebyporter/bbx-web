export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path.startsWith('/software/') && to.path !== '/software') {
    
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

