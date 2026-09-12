#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { mapDependencies } from './core'
import { renderJson, renderMermaid, renderTree } from './renderers'
import { startServer } from './server'
import { getRelativePath } from './utils'

declare const __VERSION__: string | undefined

const program = new Command()

let version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0'
try {
  const pkgPath = path.resolve(__dirname, '../package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    version = pkg.version
  }
}
catch {
  // Fail-safe default
}

program
  .name('mdvertex')
  .description('Map references in Markdown files')
  .version(version, '-v, --version', 'output the version number')
  .helpOption('-h, --help', 'display help for command')
  .argument('<entry-file>', 'path to the entry Markdown file')
  .option('-f, --format <format>', 'output format: browser, tree, json, mermaid', 'browser')
  .option('-p, --port <number>', 'server port (for browser format)', '3000')
  .option('--no-open', 'do not open browser automatically')
  .action(async (entryFile, options) => {
    const format = options.format

    if (format !== 'browser' && format !== 'tree' && format !== 'json' && format !== 'mermaid') {
      console.error(`Error: Invalid format "${format}". Supported formats: browser, tree, json, mermaid`)
      process.exit(1)
    }

    let absoluteEntry = path.resolve(entryFile)
    if (!fs.existsSync(absoluteEntry)) {
      const withMd = `${absoluteEntry}.md`
      if (fs.existsSync(withMd)) {
        absoluteEntry = withMd
      }
      else {
        console.error(`Error: File not found: ${entryFile}`)
        process.exit(1)
      }
    }

    if (format === 'browser') {
      const parsedPort = Number(options.port)
      const port = Number.isNaN(parsedPort) ? 3000 : parsedPort
      const { url } = await startServer({
        entryPath: absoluteEntry,
        port,
        open: options.open,
      })

      console.log(`\n📐 mdvertex v${version}`)
      console.log(`➜  Local:    ${url}`)
      console.log(`➜  Watching: ${getRelativePath(absoluteEntry)} and referenced files...\n`)
      return
    }

    const graph = mapDependencies(absoluteEntry)

    let output = ''
    if (format === 'tree') {
      output = renderTree(absoluteEntry, graph)
    }
    else if (format === 'json') {
      output = renderJson(absoluteEntry, graph)
    }
    else if (format === 'mermaid') {
      output = renderMermaid(absoluteEntry, graph)
    }

    console.log(output.trimEnd())
  })

program.parseAsync(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
