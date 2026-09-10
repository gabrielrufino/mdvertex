#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { mapDependencies } from './core'
import { renderJson, renderMermaid, renderTree } from './renderers'

const program = new Command()

let version = '1.0.0'
try {
  const pkgPath = path.resolve(__dirname, '../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  version = pkg.version
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
  .option('-f, --format <format>', 'output format: tree, json, mermaid', 'tree')
  .action((entryFile, options) => {
    const format = options.format

    if (format !== 'tree' && format !== 'json' && format !== 'mermaid') {
      console.error(`Error: Invalid format "${format}". Supported formats: tree, json, mermaid`)
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

program.parse(process.argv)
