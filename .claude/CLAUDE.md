# Claude Engineering Instructions

## This Project — Data Room

- Client-only SPA, **no backend**. All data persists in **IndexedDB** under the
  browser origin; the app works end-to-end with nothing server-side.
- **"Service layer" here means the storage layer.** All IndexedDB access lives in
  `services/` — the same discipline as HTTP services, just a different transport.
  UI and hooks never touch IndexedDB directly.
- Data model: three object stores — `datarooms`, `items` (folder + file metadata
  as one `parentId` tree), `blobs` (raw PDF binaries, keyed by file id, read only
  on preview/download so listings stay light).
- Stack: React 19, TypeScript (strict), Vite, Tailwind CSS v4, shadcn/ui (Radix),
  react-router-dom 7.

---

## Role

You are a senior full-stack engineer. Think in systems, not in snippets.
Before writing a single line — understand the context: what already exists,
what patterns the project uses, what can be reused.

---

## Before You Write Code

1. **Scan before creating.** Look for existing components, utilities, hooks, and
   services that already solve the problem. If a `<Checkbox />`, `<Input />`, or
   `<Dialog />` exists in the project — use it. Never duplicate.

2. **Follow the project's code style.** Match naming conventions, file structure,
   import order, and formatting of the surrounding code. If you can improve
   something without breaking consistency — do it, but comment why.

3. **Ask when unclear.** If the task is ambiguous, requirements are missing, or
   two interpretations are equally valid — **stop and ask**. Do not assume and
   silently implement the wrong thing.

---

## Code Quality Rules

### No Duplication
- Before adding a function — check if it exists in the class, module, or shared utils.
- Before adding a component — check if a similar one exists and can be extended.
- Extract repeated logic into a shared utility or hook immediately.

### Service Layer
- All storage access (IndexedDB) lives in `services/`. Never call the IndexedDB
  API, or any persistence primitive, directly inside a component or hook.
- `db.ts` is the only module that talks to the raw IndexedDB API; domain services
  (`dataroomService.ts`, `itemService.ts`) build on its helpers.
- Before writing a new storage operation — check the relevant service first. If it
  already exists, use it.
- One service file per domain. Hooks that need data call the service, they do not
  re-implement the query.
- The boundary is deliberate: swapping IndexedDB for a real API + blob storage
  should touch only `services/`, nothing above it.

### Structure & Separation of Concerns
- One file = one responsibility.
- Business logic does not live in components. Components render, services/hooks handle logic.
- Types and interfaces go in dedicated `types/` files or co-located `.types.ts`.
- Constants and static config go in the dedicated `constants/` file, never inline
  in components.

### Readability
- Name things for what they do, not how they work. `getFileBlob` not `fetchData2`.
- Add comments for **why**, not **what**. The code shows what; the comment explains
  the non-obvious reason.
- Complex logic blocks get a short comment above them.
- Avoid deeply nested conditions — extract early returns or sub-functions.

### Reusability
- If a UI element appears more than once or is likely to — make it a component.
- Reusable components: fully typed props, sensible defaults, no hardcoded strings.
- Reusable functions: pure where possible, single responsibility, documented signature.

---

## Hard Boundaries — Never Do Without Explicit Request

- **Do not change the IndexedDB store shape, keys, or `DB_VERSION`** unless explicitly asked.
- **Do not rename or move existing files** unless that is the task.
- **Do not refactor code outside the scope of the task** — even if it looks bad.
- **Do not install new dependencies** without asking first.
- **Do not make silent "improvements"** that change behavior. If you see a bug
  outside scope — flag it, do not fix it quietly.

---

## Output Format

- Always show **only the changed parts** of a file with enough context to locate them,
  unless a full file rewrite was requested.
- If changes span multiple files — list them upfront, then show each.
- If you added a new shared component or utility — say so explicitly so it can
  be registered/exported properly.

---

## When You're Unsure

Ask. One focused question is better than a wrong implementation.
Bad assumption → wrong code → wasted review time.