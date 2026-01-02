// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/gallery.css'],
  app: {
    head: {
      title: 'Outpost | Web Developer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      style: [
        {
          children: 'body { opacity: 0; }',
          type: 'text/css',
        },
      ],
    },
  },
})

