import type { DependencyGraph } from '../types'
import path from 'node:path'
import { getRelativePath } from '../utils'
import { renderMermaid } from './render-mermaid'

export function renderHtml(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
  const relativeEntry = getRelativePath(absoluteEntry)
  const mermaidCode = renderMermaid(absoluteEntry, graph)

  const idMap = new Map<string, string>()
  let idCounter = 0
  function getNodeId(filePath: string): string {
    if (!idMap.has(filePath)) {
      idMap.set(filePath, `node${idCounter++}`)
    }
    return idMap.get(filePath)!
  }

  const nodes = Array.from(graph.values()).map(node => ({
    id: getNodeId(node.filePath),
    filePath: node.filePath,
    relativePath: getRelativePath(node.filePath),
    exists: node.exists,
    isEntry: node.filePath === absoluteEntry,
  }))

  const nodeMap: Record<string, (typeof nodes)[0]> = {}
  for (const n of nodes) {
    nodeMap[n.id] = n
  }

  const links: Array<{ source: string, target: string }> = []
  for (const node of graph.values()) {
    const sourceId = getNodeId(node.filePath)
    for (const ref of node.references) {
      links.push({
        source: sourceId,
        target: getNodeId(ref),
      })
    }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const initialData = JSON.stringify({
    entry: absoluteEntry,
    relativeEntry,
    mermaid: mermaidCode,
    nodes,
    links,
    nodeMap,
  }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mdvertex - ${escapeHtml(relativeEntry)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d1117;
      --bg-panel: rgba(22, 27, 34, 0.85);
      --bg-surface: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --success: #3fb950;
      --danger: #f85149;
      --radius: 8px;
    }

    [data-theme="light"] {
      --bg: #f6f8fa;
      --bg-panel: rgba(255, 255, 255, 0.85);
      --bg-surface: #ffffff;
      --border: #d0d7de;
      --text: #24292f;
      --text-muted: #57606a;
      --accent: #0969da;
      --accent-hover: #218bff;
      --success: #1a7f37;
      --danger: #cf222e;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
    }

    header {
      position: fixed;
      top: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .entry-file {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--text-muted);
      background: var(--bg-surface);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(63, 185, 80, 0.15);
      color: var(--success);
      border: 1px solid rgba(63, 185, 80, 0.3);
      transition: all 0.2s ease;
    }

    .status-badge.disconnected {
      background: rgba(248, 81, 73, 0.15);
      color: var(--danger);
      border-color: rgba(248, 81, 73, 0.3);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button {
      background: var(--bg-surface);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    button:hover {
      background: var(--border);
      color: var(--accent-hover);
    }

    button.active {
      background: var(--accent);
      color: #ffffff;
      border-color: var(--accent-hover);
    }

    #viewport {
      width: 100vw;
      height: 100vh;
      position: relative;
      overflow: hidden;
    }

    #flowchart-view {
      width: 100%;
      height: 100%;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      left: 0;
    }

    #flowchart-view.dragging {
      cursor: grabbing;
    }

    #flowchart-canvas {
      transform-origin: center center;
      will-change: transform;
      display: inline-block;
      min-width: 400px;
      min-height: 300px;
    }

    #network-view {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }

    #network-svg {
      width: 100%;
      height: 100%;
      cursor: grab;
    }

    #network-svg.grabbing {
      cursor: grabbing;
    }

    .graph-link {
      stroke: var(--border);
      stroke-width: 1.5px;
      stroke-opacity: 0.6;
      transition: stroke 0.2s, stroke-opacity 0.2s;
    }

    .graph-link.active {
      stroke: var(--accent);
      stroke-opacity: 1;
      stroke-width: 2.5px;
    }

    .graph-node {
      cursor: pointer;
    }

    .graph-node circle {
      transition: transform 0.2s, stroke-width 0.2s, fill 0.2s;
    }

    .graph-node:hover circle {
      stroke-width: 3px;
      filter: drop-shadow(0 0 8px var(--accent));
    }

    .graph-node text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
      fill: var(--text);
      text-anchor: middle;
      pointer-events: none;
      paint-order: stroke;
      stroke: var(--bg);
      stroke-width: 3px;
      stroke-linecap: butt;
      stroke-linejoin: miter;
    }

    .graph-node.entry circle {
      fill: var(--accent);
      stroke: var(--accent-hover);
      stroke-width: 2.5px;
    }

    .graph-node.entry text {
      font-weight: 700;
      fill: var(--accent);
    }

    .graph-node.broken circle {
      fill: var(--danger);
      stroke: #ffffff;
      stroke-width: 2px;
    }

    .graph-node.broken text {
      fill: var(--danger);
    }

    .node {
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .node:hover {
      filter: brightness(1.2);
    }

    .graph-node:focus-visible circle {
      stroke: var(--accent-hover);
      stroke-width: 3px;
      outline: none;
    }

    .node:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--bg-surface);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.85rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      z-index: 200;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
  <script type="module">
    import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'

    const state = {
      ...${initialData},
      layout: localStorage.getItem('mdvertex-layout') || 'network',
      zoom: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      theme: localStorage.getItem('mdvertex-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    }

    document.documentElement.setAttribute('data-theme', state.theme)

    const flowchartView = document.getElementById('flowchart-view')
    const flowchartCanvas = document.getElementById('flowchart-canvas')
    const networkView = document.getElementById('network-view')
    const networkSvg = d3.select('#network-svg')
    const statusBadge = document.getElementById('status-badge')
    const toast = document.getElementById('toast')
    const btnLayout = document.getElementById('btn-layout')

    let networkSimulation = null
    let networkZoomBehavior = null
    let networkContainer = null

    function showToast(message, duration = 3000) {
      toast.textContent = message
      toast.classList.add('show')
      setTimeout(() => {
        toast.classList.remove('show')
      }, duration)
    }

    function initMermaid() {
      mermaid.initialize({
        startOnLoad: false,
        theme: state.theme === 'light' ? 'default' : 'dark',
        securityLevel: 'strict',
        flowchart: {
          htmlLabels: true,
          useMaxWidth: false,
        },
      })
    }

    async function openFile(nodeInfo) {
      if (!nodeInfo.exists) {
        showToast(\`❌ File not found: \${nodeInfo.relativePath}\`)
        return
      }

      showToast(\`Opening \${nodeInfo.relativePath} in editor...\`)
      try {
        const res = await fetch(\`/api/open?file=\${encodeURIComponent(nodeInfo.filePath)}\`, {
          method: 'POST',
        })
        if (!res.ok) {
          showToast(\`Failed to open file: \${nodeInfo.relativePath}\`)
        }
      } catch {
        showToast('Error connecting to server')
      }
    }

    function initNetworkView() {
      networkSvg.selectAll('*').remove()

      const defs = networkSvg.append('defs')
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'var(--border)')

      defs.append('marker')
        .attr('id', 'arrow-active')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'var(--accent)')

      networkContainer = networkSvg.append('g').attr('class', 'network-container')

      networkZoomBehavior = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          networkContainer.attr('transform', event.transform)
        })

      networkSvg.call(networkZoomBehavior)
    }

    function renderNetwork() {
      if (!networkContainer) initNetworkView()

      const width = window.innerWidth
      const height = window.innerHeight

      const nodes = state.nodes.map(d => ({ ...d }))
      const nodeById = new Map(nodes.map(d => [d.id, d]))
      const links = state.links
        .filter(l => nodeById.has(l.source) && nodeById.has(l.target))
        .map(d => ({ source: d.source, target: d.target }))

      if (networkSimulation) networkSimulation.stop()

      networkContainer.selectAll('*').remove()

      const linkElements = networkContainer.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'graph-link')
        .attr('marker-end', 'url(#arrow)')

      const nodeElements = networkContainer.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', d => \`graph-node \${d.isEntry ? 'entry' : ''} \${!d.exists ? 'broken' : ''}\`)
        .attr('tabindex', '0')
        .attr('role', 'button')
        .attr('aria-label', d => d.relativePath)
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) networkSimulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) networkSimulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }))
        .on('click', (event, d) => {
          event.stopPropagation()
          openFile(d)
        })
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            openFile(d)
          }
        })

      nodeElements.append('circle')
        .attr('r', d => d.isEntry ? 16 : 10)
        .attr('fill', d => {
          if (!d.exists) return 'var(--danger)'
          if (d.isEntry) return 'var(--accent)'
          return 'var(--bg-surface)'
        })
        .attr('stroke', d => {
          if (!d.exists) return 'var(--danger)'
          if (d.isEntry) return 'var(--accent-hover)'
          return 'var(--border)'
        })
        .attr('stroke-width', 2)

      nodeElements.append('text')
        .attr('dy', d => d.isEntry ? 26 : 20)
        .text(d => d.relativePath)

      networkSimulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(d => d.isEntry ? -600 : -250))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
        .force('collision', d3.forceCollide().radius(d => d.isEntry ? 40 : 25))
        .force('radial', d3.forceRadial(d => d.isEntry ? 0 : 200, width / 2, height / 2).strength(0.5))
        .on('tick', () => {
          linkElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)

          nodeElements
            .attr('transform', d => \`translate(\${d.x},\${d.y})\`)
        })

      // Hover effects
      nodeElements.on('mouseenter', (_event, d) => {
        const connectedNodeIds = new Set([d.id])
        links.forEach(l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          if (sId === d.id) connectedNodeIds.add(tId)
          if (tId === d.id) connectedNodeIds.add(sId)
        })

        linkElements.classed('active', l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return sId === d.id || tId === d.id
        }).attr('marker-end', l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return (sId === d.id || tId === d.id) ? 'url(#arrow-active)' : 'url(#arrow)'
        })

        nodeElements.style('opacity', n => connectedNodeIds.has(n.id) ? 1 : 0.25)
        linkElements.style('opacity', l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return (sId === d.id || tId === d.id) ? 1 : 0.15
        })
      }).on('mouseleave', () => {
        linkElements.classed('active', false).attr('marker-end', 'url(#arrow)').style('opacity', 0.6)
        nodeElements.style('opacity', 1)
      })
    }

    function applyFlowchartTransform() {
      flowchartCanvas.style.transform = \`translate(\${state.panX}px, \${state.panY}px) scale(\${state.zoom})\`
    }

    async function renderFlowchart(code) {
      try {
        const { svg } = await mermaid.render('mermaid-svg-' + Date.now(), code)
        flowchartCanvas.innerHTML = svg
        attachFlowchartClickHandlers()
      } catch (err) {
        showToast('Error rendering flowchart: ' + err.message)
      }
    }

    function attachFlowchartClickHandlers() {
      const nodes = flowchartCanvas.querySelectorAll('.node')
      nodes.forEach((nodeEl) => {
        const idAttr = nodeEl.id || ''
        const match = idAttr.match(/flowchart-(node\d+)-/)
        const nodeId = match ? match[1] : nodeEl.getAttribute('data-id')
        const nodeInfo = state.nodeMap[nodeId]

        if (nodeInfo) {
          nodeEl.style.cursor = 'pointer'
          nodeEl.setAttribute('tabindex', '0')
          nodeEl.setAttribute('role', 'button')
          nodeEl.setAttribute('aria-label', nodeInfo.relativePath)
          nodeEl.addEventListener('click', (e) => {
            e.stopPropagation()
            openFile(nodeInfo)
          })
          nodeEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              openFile(nodeInfo)
            }
          })
        }
      })
    }

    function updateLayoutView() {
      if (state.layout === 'network') {
        flowchartView.style.display = 'none'
        networkView.style.display = 'block'
        btnLayout.textContent = '🌐 Radial'
        renderNetwork()
      } else {
        networkView.style.display = 'none'
        flowchartView.style.display = 'flex'
        btnLayout.textContent = '📊 Flowchart'
        renderFlowchart(state.mermaid)
      }
    }

    function setupPanZoom() {
      flowchartView.addEventListener('mousedown', (e) => {
        if (e.target.closest('.node')) return
        state.isDragging = true
        state.startX = e.clientX - state.panX
        state.startY = e.clientY - state.panY
        flowchartView.classList.add('dragging')
      })

      window.addEventListener('mousemove', (e) => {
        if (!state.isDragging) return
        state.panX = e.clientX - state.startX
        state.panY = e.clientY - state.startY
        applyFlowchartTransform()
      })

      window.addEventListener('mouseup', () => {
        state.isDragging = false
        flowchartView.classList.remove('dragging')
      })

      flowchartView.addEventListener('wheel', (e) => {
        e.preventDefault()
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
        const newZoom = Math.min(Math.max(state.zoom * zoomFactor, 0.2), 4)
        state.zoom = newZoom
        applyFlowchartTransform()
      }, { passive: false })
    }

    function setupControls() {
      btnLayout.addEventListener('click', () => {
        state.layout = state.layout === 'network' ? 'flowchart' : 'network'
        localStorage.setItem('mdvertex-layout', state.layout)
        updateLayoutView()
      })

      document.getElementById('btn-zoom-in').addEventListener('click', () => {
        if (state.layout === 'network') {
          networkSvg.transition().duration(250).call(networkZoomBehavior.scaleBy, 1.25)
        } else {
          state.zoom = Math.min(state.zoom * 1.2, 4)
          applyFlowchartTransform()
        }
      })

      document.getElementById('btn-zoom-out').addEventListener('click', () => {
        if (state.layout === 'network') {
          networkSvg.transition().duration(250).call(networkZoomBehavior.scaleBy, 0.8)
        } else {
          state.zoom = Math.max(state.zoom / 1.2, 0.2)
          applyFlowchartTransform()
        }
      })

      document.getElementById('btn-reset').addEventListener('click', () => {
        if (state.layout === 'network') {
          networkSvg.transition().duration(350).call(networkZoomBehavior.transform, d3.zoomIdentity)
          if (networkSimulation) networkSimulation.alpha(0.3).restart()
        } else {
          state.zoom = 1
          state.panX = 0
          state.panY = 0
          applyFlowchartTransform()
        }
      })

      document.getElementById('btn-theme').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', state.theme)
        localStorage.setItem('mdvertex-theme', state.theme)
        initMermaid()
        if (state.layout === 'flowchart') {
          renderFlowchart(state.mermaid)
        }
      })
    }

    function setupSSE() {
      const sse = new EventSource('/events')

      sse.onopen = () => {
        statusBadge.classList.remove('disconnected')
        statusBadge.querySelector('.status-text').textContent = 'Live Sync'
      }

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          state.mermaid = payload.mermaid
          state.nodes = payload.nodes
          state.links = payload.links
          state.nodeMap = payload.nodeMap
          if (state.layout === 'network') {
            renderNetwork()
          } else {
            renderFlowchart(payload.mermaid)
          }
          showToast('Graph updated')
        } catch {}
      }

      sse.onerror = () => {
        statusBadge.classList.add('disconnected')
        statusBadge.querySelector('.status-text').textContent = 'Disconnected'
      }
    }

    initMermaid()
    initNetworkView()
    setupPanZoom()
    setupControls()
    setupSSE()
    updateLayoutView()
  </script>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">📐 mdvertex</div>
      <div class="entry-file" title="${escapeHtml(absoluteEntry)}">${escapeHtml(relativeEntry)}</div>
      <div class="status-badge" id="status-badge">
        <span class="status-dot"></span>
        <span class="status-text">Live Sync</span>
      </div>
    </div>
    <div class="controls">
      <button id="btn-layout" title="Toggle Layout">🌐 Radial</button>
      <button id="btn-zoom-in" title="Zoom In">+</button>
      <button id="btn-zoom-out" title="Zoom Out">-</button>
      <button id="btn-reset" title="Reset View">↺ Reset</button>
      <button id="btn-theme" title="Toggle Theme">🌓 Theme</button>
    </div>
  </header>

  <main id="viewport">
    <div id="network-view">
      <svg id="network-svg"></svg>
    </div>
    <div id="flowchart-view" style="display: none;">
      <div id="flowchart-canvas"></div>
    </div>
  </main>

  <div class="toast" id="toast"></div>
</body>
</html>`
}
