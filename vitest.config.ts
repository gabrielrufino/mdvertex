import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.stryker-tmp/**'],
  },
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
