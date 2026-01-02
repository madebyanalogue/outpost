export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  
  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image path is required',
    })
  }

  try {
    // Reconstruct the Sanity CDN URL
    // Handle both single path and array of paths
    const imagePath = Array.isArray(path) ? path.join('/') : path
    const imageUrl = `https://cdn.sanity.io/images/cnvk5vdc/production/${imagePath}`
    
    // Fetch the image from Sanity CDN
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: 'Failed to fetch image from Sanity',
      })
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Set appropriate headers
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    // Return the image buffer
    return Buffer.from(imageBuffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to proxy image',
    })
  }
})

