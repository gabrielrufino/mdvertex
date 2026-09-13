export interface LinkPosition {
  line: number
  column: number
}

export interface ParsedLink extends LinkPosition {
  raw: string
  target: string
  isExternal?: boolean
}

export interface FileReference extends LinkPosition {
  raw: string
  target: string
  resolvedPath: string
  isExternal?: boolean
}

export interface FileNode {
  filePath: string
  exists: boolean
  references: string[]
  links?: FileReference[]
}

export type DependencyGraph = Map<string, FileNode>

export interface ScanOptions {
  maxDepth?: number
  exclude?: string[]
  external?: boolean
}

export interface MapDependenciesOptions extends ScanOptions {
  vaultRoot?: string
}

export interface BrokenLink extends LinkPosition {
  source: string
  target: string
  raw: string
}

export interface CircularReference {
  cycle: string[]
  source: string
  target: string
  line: number
  column: number
}

export interface GraphMetrics {
  totalFiles: number
  totalLinks: number
  brokenLinks: BrokenLink[]
  circularReferences: CircularReference[]
  orphans: string[]
  isolated: string[]
}

export interface VaultScanResult {
  rootPath: string
  isDirectory: boolean
  graph: DependencyGraph
  metrics: GraphMetrics
}
