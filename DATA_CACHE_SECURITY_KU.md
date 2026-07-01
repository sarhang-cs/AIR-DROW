# Data, Cache & Security Rules

## 1. Source of truth
- **IndexedDB**: local source of truth for a browser profile.
- **Server API**: optional remote source of truth only when a user explicitly Pushes/Pulls or enables auto-sync.
- **Cache Storage**: application code only. It must not become a second project database.
- **localStorage**: small emergency reload mirror only; not primary storage and not a token vault.

## 2. Save order
1. Normalize the project.
2. Canonically serialize it.
3. Create a SHA-256 integrity value when Web Crypto is available.
4. Commit current project + recovery checkpoint in one IndexedDB transaction.
5. Create a size-limited local reload mirror.
6. Only after local save succeeds, optionally push to the API/outbox.

## 3. Conflict rule
Remote `PUT /api/projects/{id}` carries `base_revision`.
- Revision matches: server saves a new revision.
- Revision differs: server returns `409 Conflict`.
- The app does not silently overwrite remote data after a conflict.

## 4. Lock rule
A busy operation locks only controls that could corrupt its state:
- save / restore / clear local data
- push / pull / outbox flush
- camera start/stop
- canvas pointer input while a restore is being applied

Text reading, browser back navigation, links and accessibility selection are not globally disabled.

## 5. Long press rule
Only the canvas captures long press for the app’s quick menu. Browser long press behavior is not disabled for ordinary links, text fields or documentation.

## 6. External vs internal resources
- Internal/same-origin assets can be cached by the PWA service worker.
- External resources are not assumed cacheable or permanently available.
- API responses are fetched live; stale private project data is not placed in Cache Storage.
