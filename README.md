# Data Room

A single-page **Data Room** — an organized, secure-feeling repository for storing
and browsing due-diligence documents, inspired by Google Drive / Dropbox. Users
can create datarooms (top-level drives), nest folders arbitrarily, and upload,
preview, rename, and delete PDF files. Everything runs client-side and persists
in the browser, so the app works end-to-end with no backend.

Built with **React + TypeScript + Tailwind CSS v4 + shadcn/ui**, bundled by Vite.

---

## Getting started

Requirements: **Node 20+** and **npm**.

```bash
npm install      # install dependencies
npm run dev      # start the dev server → http://localhost:3000
```

Other scripts:

```bash
npm run build      # type-check (tsc) + production build to /dist
npm run preview    # serve the production build locally
npm run typecheck  # type-check only
```

> The app stores data in **IndexedDB** under your browser origin. To reset all
> datarooms and files, clear site data for the origin (DevTools → Application →
> Storage → Clear site data).

---

## What you can do

**Datarooms**
- Create, rename, and delete datarooms. Deleting a dataroom cascades to every
  folder, file, and stored blob inside it.

**Folders**
- Create folders and nest them arbitrarily deep.
- Navigate in via clicking; navigate back up via **breadcrumbs**.
- Rename folders.
- Delete a folder — the confirmation spells out exactly how many nested folders
  and files will be removed, and the delete is recursive.

**Files (PDF)**
- Upload via the **Upload** button or **drag & drop** onto the folder.
- **Preview PDFs in-app** in a viewer dialog; **download** the original.
- Rename and delete files.

**Search & filter**
- Filter the datarooms list by name.
- Search an entire dataroom's tree by file/folder name — results show **where each
  match lives** (its folder path) and open the folder or PDF directly.

---

## Design decisions

### Data model
Three concerns, three IndexedDB object stores:

| Store       | Holds                                   | Key      |
| ----------- | --------------------------------------- | -------- |
| `datarooms` | Top-level drives                        | `id`     |
| `items`     | Folder **and** file metadata (a tree)   | `id`     |
| `blobs`     | Raw PDF binaries                        | file `id`|

Folders and files share one `items` store and are distinguished by a `type`
discriminant (`'folder' | 'file'`). The tree is modelled with a single
`parentId` pointer (`null` at a dataroom's root) rather than nested arrays — this
keeps every mutation O(1) to write, makes "list a folder's children" a simple
filter, and avoids rewriting large nested blobs on every change.

**Blobs are stored separately from metadata.** Listing a folder should never pull
megabytes of PDF data into memory, so the binary lives in its own store keyed by
the file id and is only read when a file is previewed or downloaded.

### Why IndexedDB (not localStorage)
Uploaded PDFs are binary and can be several MB each — far beyond localStorage's
~5 MB, string-only budget. IndexedDB stores `Blob`s natively and scales to large
files without base64 bloat or quota errors. `src/services/db.ts` is a thin
promise wrapper around the raw API; nothing else touches IndexedDB directly.

### Architecture & separation of concerns
```
src/
  services/     data layer — the only place that talks to storage
    db.ts               generic IndexedDB helpers (open, get, put, remove…)
    dataroomService.ts  dataroom CRUD (+ cascade delete)
    itemService.ts      folder/file CRUD, upload, recursive delete, breadcrumbs
  hooks/        React state that calls services and exposes { data, status, refresh }
  types/        domain model + type guards
  lib/          pure utilities (cn, id, naming, byte/date formatting)
  constants/    static config (accepted types, size limit)
  components/
    ui/                 shadcn/ui primitives
    NameDialog.tsx      one reusable single-field dialog (create + rename)
    ConfirmDialog.tsx   one reusable confirmation (all deletes)
    EmptyState.tsx      one reusable empty/error placeholder
  features/     feature-specific, presentational components (cards, viewer…)
  pages/        route screens compose hooks + features
```
Components render; **services and hooks hold the logic**. UI never calls storage
directly. Reusable pieces (`NameDialog`, `ConfirmDialog`, `EmptyState`, `ItemCard`)
are extracted so create/rename/delete flows share one implementation instead of
being duplicated per entity.

### Edge cases handled
- **Duplicate names** — creating a folder or uploading a file auto-suffixes on
  collision (`report.pdf` → `report (1).pdf`), matching how OS file managers
  behave, so the action never dead-ends. Duplicates are also de-duped *within a
  single multi-file upload*. **Renames** instead surface an inline "already
  exists" error, because there the user typed an explicit name.
- **Non-PDF / oversized uploads** — a mixed selection uploads the valid PDFs and
  reports the rest as skipped (with the reason) via a toast, rather than failing
  the whole batch. A 50 MB per-file guard rail prevents runaway blobs.
- **Recursive delete** — deleting a folder or dataroom removes all descendants
  and their blobs in a single transaction; the confirm dialog shows the counts.
- **Stale / invalid URLs** — a folder id that no longer resolves renders a clean
  "Not found" state instead of a blank page.
- **Loading & empty states** everywhere; long names truncate with tooltips.
- **Blob lifecycle** — preview/download object URLs are revoked after use to
  avoid leaking memory.

### UX details
- Drag-and-drop PDF upload with a drop overlay, plus a classic file picker.
- Breadcrumb navigation for deep folder trees.
- In-app PDF preview (no download required) with a one-click download.
- Optimistic-feeling toasts confirm every action; destructive actions confirm first.
- Keyboard accessible: cards are focusable/activatable, dialogs trap focus (Radix).

---

## Notable trade-offs / possible next steps
- **Persistence is per-browser** (mock requirement). A real deployment would swap
  `services/*` for API calls + blob storage — the service boundary is designed so
  only that layer changes.
- **No multi-tab sync.** The hooks refresh after local mutations; a production
  build could add a `BroadcastChannel` or IndexedDB change events.
- **Search** (per-dataroom tree search + a datarooms-list filter) is implemented.
  **Move/reorder** of items is a natural next step — the `parentId` model makes it easy.

---

## Tech stack
React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS v4 · shadcn/ui (Radix) ·
react-router-dom 7 · sonner · lucide-react · IndexedDB.
