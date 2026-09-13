import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'vite-plugin-hbs',
      transform(code, id) {
        if (id.endsWith('.hbs')) {
          return {
            code: `export default ${JSON.stringify(code)}`,
            map: null,
          }
        }
      },
    },
  ],
})
