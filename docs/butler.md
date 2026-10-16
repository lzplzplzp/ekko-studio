# Butler

The butler is a Studio routing layer. It reads a project index, matches a
natural-language request, reuses or creates a single chat session, and injects
a context pack. It does not connect to a database and it does not store
passwords.

## Index location

The loader checks these locations in order:

1. `BUTLER_PROJECTS_INDEX` (absolute path, or relative to the server process cwd)
2. `$HERMES_WEB_UI_HOME/butler/projects.index.json` when that file exists
   (`HERMES_WEBUI_STATE_DIR` is the other Web UI home override)
3. `projects.index.json` in the server process cwd
4. The bundled example at
   `packages/server/src/modules/studio/services/butler/projects.index.example.json`

The example uses fake project and alias data so the golden path can be demoed
without real credentials. Replace it with a local index before daily use.
`projects.index.schema.json` next to the example is the authoring contract.
The loader drops keys such as `password`, `jdbcUrl`, and `connectionString`
instead of copying them into a session. Do not put real passwords in the index.

## HTTP

- `GET /api/studio/butler/index` returns the loaded projects and alias status.
- `GET /api/studio/butler/registry` returns the session registry.
- `POST /api/studio/butler/route` with `{ "text": "...", "preferReuse": true }`
  creates or reuses a Studio session and appends one user message.

The Web UI entry is **Butler** (`/#/hermes/butler`).

## Desktop window

When the page runs inside the desktop shell, it calls the existing
`hermesDesktop.openChatWindow(sessionId, profile)` bridge. That bridge focuses
an existing chat window or opens one. The HTTP API cannot launch
`Ekko Studio.app` by itself. In a browser, the session is still a normal
`builtin_agent` chat on the `default` profile: open
`/#/hermes/session/<sessionId>` or pick it from the chat list.

## Golden path

Use the bundled example, or point `BUTLER_PROJECTS_INDEX` at a copy of it, and
submit:

> 给我看下线上项目管理平台今天推新电子档案失败的有哪些合同

Expected routing:

- business line `value-added`, project `value-added/xmglpt`, environment `prod-ro`
- workdir `value-added/xmglpt`
- first call creates a chat; the second call with reuse enabled appends to it
- context names alias `xmglpt-prod-ro` and whether that credential is valid today
- the configured `groupRoomId` is only a suggestion; the session kind stays `chat`
- a procurement project key or a “采购线” request is rejected and does not create a session

## Differences from the v0.1 note

- This fork implements path A inside `modules/studio`, not a standalone agent.
- Intent matching is keyword and alias based.
- The index is JSON. This repository does not parse a private `AGENTS.md`.
- Credential state is the index flag `credentialValidToday`. There is no
  Keychain lookup.
- Group delivery is a suggestion. Posting into a live ops room is not part of
  this slice.
