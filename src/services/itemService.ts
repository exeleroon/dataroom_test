import type {
  Crumb,
  DescendantCount,
  FileItem,
  FolderItem,
  Item,
  SearchResult,
} from '@/types'
import { isFolder } from '@/types'
import { createId } from '@/lib/id'
import { DuplicateNameError, makeUniqueName, nameExists, trimName } from '@/lib/naming'
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  ROOT_PARENT_ID,
} from '@/constants'
import {
  STORE,
  get,
  getAllByIndex,
  put,
  putItemWithBlob,
  removeMany,
} from '@/services/db'

interface BlobRecord {
  id: string
  blob: Blob
}

/** A file the user tried to upload but that we refused, with a friendly reason. */
export interface SkippedUpload {
  name: string
  reason: string
}

export interface UploadResult {
  created: FileItem[]
  skipped: SkippedUpload[]
}

/** Folders sort before files; within a type, sort alphabetically (case-insensitive). */
function compareItems(a: Item, b: Item): number {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

class ItemService {
  /** Every item (folders + files) in a dataroom, unsorted. */
  private allInDataroom(dataroomId: string): Promise<Item[]> {
    return getAllByIndex<Item>(STORE.items, 'dataroomId', dataroomId)
  }

  /** Direct children of a folder (or of the dataroom root when parentId is null). */
  async listChildren(dataroomId: string, parentId: string | null): Promise<Item[]> {
    const all = await this.allInDataroom(dataroomId)
    return all.filter((item) => item.parentId === parentId).sort(compareItems)
  }

  /**
   * Case-insensitive name search across an entire dataroom's tree (folders and
   * files). Each hit carries the folder path to its parent so the UI can show
   * where the match lives.
   */
  async searchInDataroom(dataroomId: string, query: string): Promise<SearchResult[]> {
    const q = trimName(query).toLowerCase()
    if (!q) return []

    const all = await this.allInDataroom(dataroomId)
    const byId = new Map(all.map((item) => [item.id, item]))

    return all
      .filter((item) => item.name.toLowerCase().includes(q))
      .sort(compareItems)
      .map((item) => ({ item, path: this.ancestorPath(item, byId) }))
  }

  getItem(id: string): Promise<Item | undefined> {
    return get<Item>(STORE.items, id)
  }

  private async siblingNames(
    dataroomId: string,
    parentId: string | null,
    exceptId?: string,
  ): Promise<string[]> {
    const all = await this.allInDataroom(dataroomId)
    return all
      .filter((item) => item.parentId === parentId && item.id !== exceptId)
      .map((item) => item.name)
  }

  async createFolder(
    dataroomId: string,
    parentId: string | null,
    name: string,
  ): Promise<FolderItem> {
    const clean = name.trim()
    if (!clean) throw new Error('Folder name is required.')

    const siblings = await this.siblingNames(dataroomId, parentId)
    // A manually created folder auto-dedupes so the action never dead-ends.
    const uniqueName = makeUniqueName(clean, siblings)

    const now = Date.now()
    const folder: FolderItem = {
      id: createId(),
      dataroomId,
      parentId,
      type: 'folder',
      name: uniqueName,
      createdAt: now,
      updatedAt: now,
    }
    return put(STORE.items, folder)
  }

  /**
   * Upload PDF files into a folder. Non-PDFs and oversized files are skipped
   * (not thrown) so a mixed selection still uploads what it can. Names are made
   * unique against existing siblings *and* against others in the same batch.
   */
  async uploadFiles(
    dataroomId: string,
    parentId: string | null,
    files: File[],
  ): Promise<UploadResult> {
    const created: FileItem[] = []
    const skipped: SkippedUpload[] = []
    const takenNames = await this.siblingNames(dataroomId, parentId)

    for (const file of files) {
      const isPdf =
        (ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type) ||
        file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        skipped.push({ name: file.name, reason: 'Only PDF files are supported' })
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        skipped.push({ name: file.name, reason: 'File exceeds the 50 MB limit' })
        continue
      }

      const uniqueName = makeUniqueName(file.name, takenNames)
      takenNames.push(uniqueName)

      const now = Date.now()
      const id = createId()
      const item: FileItem = {
        id,
        dataroomId,
        parentId,
        type: 'file',
        name: uniqueName,
        mimeType: 'application/pdf',
        size: file.size,
        createdAt: now,
        updatedAt: now,
      }

      // Persist the item and its blob atomically — all-or-nothing, so a failed
      // or interrupted upload never leaves an orphaned blob behind.
      await putItemWithBlob(item, id, file)
      created.push(item)
    }

    return { created, skipped }
  }

  async rename(id: string, name: string): Promise<Item> {
    // Normalize identically to create/upload so stored names stay consistent and
    // the whitespace/case-insensitive uniqueness checks remain reliable.
    const clean = trimName(name)
    if (!clean) throw new Error('Name is required.')

    const item = await this.getItem(id)
    if (!item) throw new Error('Item not found.')

    const siblings = await this.siblingNames(item.dataroomId, item.parentId, id)
    if (nameExists(clean, siblings)) throw new DuplicateNameError(clean)

    return put(STORE.items, { ...item, name: clean, updatedAt: Date.now() })
  }

  /** Retrieve the stored PDF blob for a file, or undefined if missing. */
  async getFileBlob(id: string): Promise<Blob | undefined> {
    const record = await get<BlobRecord>(STORE.blobs, id)
    return record?.blob
  }

  /** Count every folder and file nested beneath a folder (excludes the folder itself). */
  async countDescendants(id: string): Promise<DescendantCount> {
    const item = await this.getItem(id)
    if (!item || !isFolder(item)) return { folders: 0, files: 0 }

    const all = await this.allInDataroom(item.dataroomId)
    const descendants = this.collectDescendants(id, all)

    return descendants.reduce<DescendantCount>(
      (acc, node) => {
        if (node.type === 'folder') acc.folders += 1
        else acc.files += 1
        return acc
      },
      { folders: 0, files: 0 },
    )
  }

  async delete(id: string): Promise<void> {
    const item = await this.getItem(id)
    if (!item) return

    if (item.type === 'file') {
      await removeMany([item.id], [item.id])
      return
    }

    // Folder: remove it plus everything nested under it in one transaction.
    const all = await this.allInDataroom(item.dataroomId)
    const descendants = this.collectDescendants(id, all)
    const toDelete = [item, ...descendants]
    const itemIds = toDelete.map((node) => node.id)
    const blobIds = toDelete.filter((node) => node.type === 'file').map((node) => node.id)
    await removeMany(itemIds, blobIds)
  }

  /** Remove all items and blobs belonging to a dataroom (used on dataroom delete). */
  async deleteAllInDataroom(dataroomId: string): Promise<void> {
    const all = await this.allInDataroom(dataroomId)
    if (all.length === 0) return
    const itemIds = all.map((node) => node.id)
    const blobIds = all.filter((node) => node.type === 'file').map((node) => node.id)
    await removeMany(itemIds, blobIds)
  }

  /** Path from the dataroom root down to `folderId`, for breadcrumbs. */
  async getBreadcrumbs(dataroomId: string, folderId: string | null): Promise<Crumb[]> {
    if (folderId === ROOT_PARENT_ID) return []

    const all = await this.allInDataroom(dataroomId)
    const byId = new Map(all.map((item) => [item.id, item]))

    const trail: Crumb[] = []
    let current = folderId ? byId.get(folderId) : undefined
    // Walk up parent links; guard against cycles with a visited set.
    const visited = new Set<string>()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      trail.unshift({ id: current.id, name: current.name })
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return trail
  }

  /** Folder path (root → the item's parent) for an item, using an in-memory index. */
  private ancestorPath(item: Item, byId: Map<string, Item>): Crumb[] {
    const path: Crumb[] = []
    const visited = new Set<string>()
    let current = item.parentId ? byId.get(item.parentId) : undefined
    // Walk up parent links; the visited set guards against unexpected cycles.
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      path.unshift({ id: current.id, name: current.name })
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return path
  }

  /** Depth-first collection of every node beneath `rootId`. */
  private collectDescendants(rootId: string, all: Item[]): Item[] {
    const childrenByParent = new Map<string, Item[]>()
    for (const item of all) {
      if (item.parentId === null) continue
      const bucket = childrenByParent.get(item.parentId)
      if (bucket) bucket.push(item)
      else childrenByParent.set(item.parentId, [item])
    }

    const result: Item[] = []
    const stack = [...(childrenByParent.get(rootId) ?? [])]
    while (stack.length > 0) {
      const node = stack.pop()!
      result.push(node)
      const children = childrenByParent.get(node.id)
      if (children) stack.push(...children)
    }
    return result
  }
}

export const itemService = new ItemService()
