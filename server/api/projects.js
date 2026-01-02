import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'cnvk5vdc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

export default defineEventHandler(async () => {
  try {
    const query = `*[_type == "project"] | order(orderRank) {
      _id,
      title,
      subtitle,
      url,
      "imageUrl": image.asset->url,
      agency->{
        title,
        url
      }
    }`
    
    const projects = await client.fetch(query)
    
    return projects.map((project) => {
      // Transform Sanity CDN URLs to use our proxy route
      let imageUrl = project.imageUrl || ''
      if (imageUrl && imageUrl.includes('cdn.sanity.io')) {
        // Extract the path from the Sanity CDN URL
        // Example: https://cdn.sanity.io/images/cnvk5vdc/production/4b95ad7ce00bc69f3746a4de5a6afdde945ae677-3400x2000.jpg
        // Extract: 4b95ad7ce00bc69f3746a4de5a6afdde945ae677-3400x2000.jpg
        const urlMatch = imageUrl.match(/\/production\/(.+)$/)
        if (urlMatch) {
          imageUrl = `/api/images/${urlMatch[1]}`
        }
      }
      
      return {
        title: project.title || '',
        subtitle: project.subtitle || '',
        href: project.url || '#',
        image: imageUrl,
        agency: project.agency || null,
      }
    })
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch projects from Sanity',
    })
  }
})

