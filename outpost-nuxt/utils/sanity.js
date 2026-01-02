import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'

export const client = createClient({
  projectId: 'cnvk5vdc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
  // No token needed for public read access
})

const builder = createImageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}

export async function getProjects() {
  try {
    // Use server route to avoid CORS issues
    const response = await fetch('/api/projects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const projects = await response.json()
    return projects || []
  } catch (error) {
    console.error('Error fetching projects from server route:', error)
    // Fallback: return empty array if server route fails
    return []
  }
}

