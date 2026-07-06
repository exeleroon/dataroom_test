/** Domain model for the Data Room. All entities are persisted in IndexedDB. */

/** A top-level drive that contains a tree of folders and files. */
export interface Dataroom {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export type ItemType = 'folder' | 'file'

interface BaseItem {
  id: string
  dataroomId: string
  /** Parent folder id, or null when the item lives at the dataroom root. */
  parentId: string | null
  type: ItemType
  name: string
  createdAt: number
  updatedAt: number
}

export interface FolderItem extends BaseItem {
  type: 'folder'
}

export interface FileItem extends BaseItem {
  type: 'file'
  mimeType: string
  size: number
}

/** A node in a dataroom's tree — either a folder or a file. */
export type Item = FolderItem | FileItem

/** A single hop in a folder path, used to render breadcrumbs. */
export interface Crumb {
  id: string | null
  name: string
}

/** Aggregate counts of everything nested under a folder (for delete confirmation). */
export interface DescendantCount {
  folders: number
  files: number
}

/** A search hit: the matched item plus its folder path (root → parent) for context. */
export interface SearchResult {
  item: Item
  path: Crumb[]
}

export function isFolder(item: Item): item is FolderItem {
  return item.type === 'folder'
}

export function isFile(item: Item): item is FileItem {
  return item.type === 'file'
}
