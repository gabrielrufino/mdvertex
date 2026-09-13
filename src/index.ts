#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { consola } from 'consola'
import { analyzeGraph, mapDependencies, scanDirectory } from './core'
import { renderHtml, renderJson, renderMermaid, renderTree } from './renderers'
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
  .description('Map references in Markdown files and directories')
  .version(version, '-v, --version', 'output the version number')
  .helpOption('-h, --help', 'display help for command')
  .argument('<target-path>', 'path to Markdown file or directory')
  .option('-f, --format <format>', 'output format: browser, html, tree, json, mermaid', 'browser')
  .option('-o, --output <file>', 'output file path to write the result')
  .option('-c, --check', 'check for broken links and circular references')
  .option('--strict', 'treat circular references as fatal errors in check mode')
  .option('-d, --max-depth <number>', 'max traversal or directory depth', Number.parseInt)
  .option('-e, --exclude <patterns...>', 'patterns or folder names to exclude')
  .option('--external', 'include external links')
  .option('-p, --port <number>', 'server port (for browser format)', '3000')
  .option('--no-open', 'do not open browser automatically')
  .action(async (targetPath, options) => {
    let absoluteTarget = path.resolve(targetPath)
    if (!fs.existsSync(absoluteTarget)) {
      const withMd = `${absoluteTarget}.md`
      if (fs.existsSync(withMd)) {
        absoluteTarget = withMd
      }
      else {
        consola.error(`Path not found: ${targetPath}`)
        process.exit(1)
      }
    }

    const isDirectory = fs.statSync(absoluteTarget).isDirectory()
    const scanOpts = {
      maxDepth: options.maxDepth,
      exclude: options.exclude,
      external: options.external,
    }

    let graph
    let metrics

    if (isDirectory) {
      const scanResult = scanDirectory(absoluteTarget, scanOpts)
      graph = scanResult.graph
      metrics = scanResult.metrics
    }
    else {
      graph = mapDependencies(absoluteTarget, scanOpts)
      metrics = analyzeGraph(graph)
    }

    if (options.check) {
      const relTarget = getRelativePath(absoluteTarget)
      consola.info(`mdvertex check: Scanning references from ${relTarget}...\n`)

      if (metrics.brokenLinks.length > 0) {
        process.stdout.write(`Broken links (${metrics.brokenLinks.length}):\n`)
        for (const broken of metrics.brokenLinks) {
          process.stdout.write(`  ❌ ${getRelativePath(broken.source)}:${broken.line}:${broken.column} -> ${broken.raw}\n`)
        }
        process.stdout.write('\n')
      }

      if (metrics.circularReferences.length > 0) {
        process.stdout.write(`Circular references (${metrics.circularReferences.length}):\n`)
        for (const circ of metrics.circularReferences) {
          const chain = circ.cycle.map(p => getRelativePath(p)).join(' -> ')
          process.stdout.write(`  🔄 ${getRelativePath(circ.source)}:${circ.line}:${circ.column} -> ${chain}\n`)
        }
        process.stdout.write('\n')
      }

      process.stdout.write('Summary:\n')
      process.stdout.write(`  Files checked:       ${metrics.totalFiles}\n`)
      process.stdout.write(`  Total links checked: ${metrics.totalLinks}\n`)
      process.stdout.write(`  Broken links:        ${metrics.brokenLinks.length}\n`)
      process.stdout.write(`  Circular references: ${metrics.circularReferences.length}\n`)

      if (isDirectory) {
        process.stdout.write(`  Orphan files:        ${metrics.orphans.length}\n`)
        process.stdout.write(`  Isolated files:      ${metrics.isolated.length}\n`)
      }
      process.stdout.write('\n')

      const hasFatalErrors = metrics.brokenLinks.length > 0 || (options.strict && metrics.circularReferences.length > 0)
      if (hasFatalErrors) {
        process.stderr.write(`\nCheck failed: ${metrics.brokenLinks.length} broken links found.\n`)
        process.exit(1)
      }
      else {
        process.stdout.write('All references are valid!\n')
        process.exit(0)
      }
    }

    let format = options.format
    const outputFile = options.output ? path.resolve(options.output) : null

    if (outputFile && format === 'browser') {
      const ext = path.extname(outputFile).toLowerCase()
      if (ext === '.html' || ext === '.htm') {
        format = 'html'
      }
      else if (ext === '.json') {
        format = 'json'
      }
      else if (ext === '.mmd' || ext === '.mermaid') {
        format = 'mermaid'
      }
      else if (ext === '.txt') {
        format = 'tree'
      }
      else {
        format = 'html'
      }
    }

    const validFormats = ['browser', 'html', 'tree', 'json', 'mermaid']
    if (!validFormats.includes(format)) {
      consola.error(`Invalid format "${format}". Supported formats: ${validFormats.join(', ')}`)
      process.exit(1)
    }

    if (format === 'browser' && !outputFile) {
      const parsedPort = Number(options.port)
      const port = Number.isNaN(parsedPort) ? 3000 : parsedPort
      const { url } = await startServer({
        entryPath: absoluteTarget,
        port,
        open: options.open,
        ...scanOpts,
      })

      consola.ready({
        message: `mdvertex v${version}\nLocal:    ${url}\nWatching: ${getRelativePath(absoluteTarget)} and referenced files...`,
        badge: true,
      })
      return
    }

    let output = ''
    if (format === 'tree') {
      output = renderTree(absoluteTarget, graph)
    }
    else if (format === 'json') {
      output = renderJson(absoluteTarget, graph, metrics)
    }
    else if (format === 'mermaid') {
      output = renderMermaid(absoluteTarget, graph)
    }
    else if (format === 'html' || format === 'browser') {
      output = renderHtml(absoluteTarget, graph)
    }

    if (outputFile) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true })
      fs.writeFileSync(outputFile, output, 'utf8')
      consola.success(`Saved ${format} output to ${getRelativePath(outputFile)}`)
    }
    else {
      process.stdout.write(`${output.trimEnd()}\n`)
    }
  })

program.parseAsync(process.argv).catch((err) => {
  consola.error(err)
  process.exit(1)
})
