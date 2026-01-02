import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'
import structure from './structure'

export default defineConfig({
  name: 'default',
  title: 'Outpost Studio',
  projectId: 'cnvk5vdc',
  dataset: 'production',
  plugins: [
    structureTool({
      structure,
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})

