import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: 'cnvk5vdc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

const builder = imageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}

export async function getProjects() {
  const query = `*[_type == "project"] | order(year desc) {
    _id,
    title,
    year,
    url,
    "imageUrl": image.asset->url
  }`
  
  try {
    const projects = await client.fetch(query)
    
    return projects.map(project => ({
      title: project.title || '',
      year: project.year || new Date().getFullYear(),
      href: project.url || '#',
      image: project.imageUrl || '',
    }))
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

