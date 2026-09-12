export interface FileNode {
  filePath: string
  exists: boolean
  references: string[]
}

export type DependencyGraph = Map<string, FileNode>
