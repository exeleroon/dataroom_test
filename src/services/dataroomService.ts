import type { Dataroom } from '@/types'
import { createId } from '@/lib/id'
import { DuplicateNameError, makeUniqueName, nameExists, trimName } from '@/lib/naming'
import { itemService } from '@/services/itemService'
import { STORE, get, getAll, put, remove } from '@/services/db'

/**
 * CRUD for Datarooms (the top-level drives). Deleting a dataroom cascades to
 * every folder, file and blob it contains via {@link itemService}.
 */
class DataroomService {
  async list(): Promise<Dataroom[]> {
    const rooms = await getAll<Dataroom>(STORE.datarooms)
    return rooms.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  get(id: string): Promise<Dataroom | undefined> {
    return get<Dataroom>(STORE.datarooms, id)
  }

  async create(name: string): Promise<Dataroom> {
    const clean = name.trim()
    if (!clean) throw new Error('Dataroom name is required.')

    const existing = (await this.list()).map((r) => r.name)
    // Datarooms are peers, so a unique name is auto-derived rather than rejected.
    const uniqueName = makeUniqueName(clean, existing)

    const now = Date.now()
    const room: Dataroom = { id: createId(), name: uniqueName, createdAt: now, updatedAt: now }
    return put(STORE.datarooms, room)
  }

  async rename(id: string, name: string): Promise<Dataroom> {
    // Normalize identically to create() so stored names stay consistent.
    const clean = trimName(name)
    if (!clean) throw new Error('Dataroom name is required.')

    const room = await this.get(id)
    if (!room) throw new Error('Dataroom not found.')

    const siblings = (await this.list()).filter((r) => r.id !== id).map((r) => r.name)
    if (nameExists(clean, siblings)) throw new DuplicateNameError(clean)

    return put(STORE.datarooms, { ...room, name: clean, updatedAt: Date.now() })
  }

  /** Bump updatedAt so recently-touched rooms float to the top of the list. */
  async touch(id: string): Promise<void> {
    const room = await this.get(id)
    if (room) await put(STORE.datarooms, { ...room, updatedAt: Date.now() })
  }

  async delete(id: string): Promise<void> {
    await itemService.deleteAllInDataroom(id)
    await remove(STORE.datarooms, id)
  }
}

export const dataroomService = new DataroomService()
