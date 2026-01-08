import { createClient } from '@supabase/supabase-js'

export async function generatePrerenderRoutes(): Promise<string[]> {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, skipping route generation')
    return ['/', '/software', '/kits']
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Fetch all approved resources
    const { data: resources, error } = await supabase
      .from('resources')
      .select('slug, resource_types(slug)')
      .eq('status', 'approved')
    
    if (error) {
      console.error('Error fetching resources for prerendering:', error)
      return ['/', '/software', '/kits']
    }
    
    const routes: string[] = ['/', '/software', '/kits']
    
    resources?.forEach(resource => {
      const typeSlug = resource.resource_types?.slug
      if (typeSlug === 'software') {
        routes.push(`/software/${resource.slug}`)
      } else if (typeSlug === 'sounds') {
        routes.push(`/kits/${resource.slug}`)
      }
    })
    
    console.log(`Generated ${routes.length} routes for prerendering`)
    return routes
  } catch (error) {
    console.error('Error generating prerender routes:', error)
    return ['/', '/software', '/kits']
  }
}

