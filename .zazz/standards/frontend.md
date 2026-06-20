---
last_updated_at: 2026-06-19
status: placeholder
---

# Frontend (React + Vite + Mantine)

> **Status: placeholder stub — to be expanded.**
> This is an analogous standard for the React + Vite + Mantine stack, created as a
> placeholder so the standards index structure exists. It should be expanded into a
> real baseline by inspecting `client/src/` via the `standard-builder` skill. Until
> then, the client mutation pattern and i18n rules already captured in
> [coding-styles.md](./coding-styles.md) take precedence.

## Scope

This standard governs the React client under `client/src/`: component structure,
custom hooks, the UI state/mutation flow, drag-and-drop, the task graph, and i18n.

## Intended coverage (to be drafted from the codebase)

- Custom hooks for data fetching and state management (`client/src/hooks/`); no
  Redux/MobX.
- The client mutation pattern: single source of truth per screen, no duplicate
  mutation hooks in child forms/modals, immediate state update from API response,
  failure keeps editor open (see
  [coding-styles.md §Client mutation pattern](./coding-styles.md#client-mutation-pattern-no-stale-ui-after-save)).
- Race-safety and revalidation rules for mutation-sensitive reloads.
- Mantine Core components; `@mantine/core`, `@mantine/hooks`, `@mantine/modals`.
- Drag-and-drop with `@dnd-kit` for the Kanban boards.
- Task graph with `@xyflow/react`.
- Routing with `react-router-dom` v7.
- i18n with `react-i18next`; translation key shape `{domain}.{category}.{CODE}`;
  locale files under `client/src/i18n/locales/` (see
  [coding-styles.md §i18n](./coding-styles.md#i18n-translatable-items)).
- Token storage in `localStorage` under `TB_TOKEN`; API calls send `TB_TOKEN` header.
- Markdown editor (`@uiw/react-md-editor`) and image uploads (base64 for local dev).

## Related standards

- [coding-styles.md](./coding-styles.md) — currently authoritative for the client
  mutation pattern and i18n.
- [system-architecture.md](./system-architecture.md) — client stack overview.
- [http-layer.md](./http-layer.md) — the API the client consumes.
- [testing.md](./testing.md) — backend integration tests; note frontend test strategy
  is not yet codified.

## Drafting this standard

Run the `standard-builder` skill against `client/src/` to extract observed patterns
into Desired/Not-desired examples, then move the frontend rules currently in
`coding-styles.md` here and leave cross-links.
