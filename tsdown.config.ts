import fs from 'node:fs'
import { defineConfig } from 'tsdown'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  fixedExtension: false,
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
})
