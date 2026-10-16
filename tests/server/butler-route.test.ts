import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const GOLDEN = '给我看下线上项目管理平台今天推新电子档案失败的有哪些合同'
const SECRET = 'fixture-password-value'

describe('butler routes', () => {
  let db: { prepare: (sql: string) => { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[]; run: (...args: unknown[]) => unknown }; exec: (sql: string) => void; close: () => void }
  let server: Server
  let root: string
  let base: string
  const originalIndex = process.env.BUTLER_PROJECTS_INDEX

  beforeEach(async () => {
    vi.resetModules()
    delete process.env.BUTLER_PROJECTS_INDEX
    root = await mkdtemp(join(tmpdir(), 'studio-butler-'))
    const { DatabaseSync } = await import('node:sqlite')
    db = new DatabaseSync(':memory:')
    vi.doMock('../../packages/server/src/modules/studio/infrastructure/database/index', () => ({
      getDb: () => db,
      isSqliteAvailable: () => true,
    }))
    const { initAllHermesTables } = await import('../../packages/server/src/modules/studio/infrastructure/database/schemas')
    initAllHermesTables()
    const { default: Koa } = await import('koa')
    const { bodyParser } = await import('@koa/bodyparser')
    const { butlerRoutes } = await import('../../packages/server/src/modules/studio/routes/butler')
    const app = new Koa()
    app.use(bodyParser())
    app.use(butlerRoutes.routes())
    app.use(butlerRoutes.allowedMethods())
    server = await new Promise<Server>(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  })

  afterEach(async () => {
    if (originalIndex === undefined) delete process.env.BUTLER_PROJECTS_INDEX
    else process.env.BUTLER_PROJECTS_INDEX = originalIndex
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    db?.close()
    await rm(root, { recursive: true, force: true })
    vi.doUnmock('../../packages/server/src/modules/studio/infrastructure/database/index')
    vi.resetModules()
  })

  async function post(text: string, preferReuse = true) {
    return fetch(`${base}/api/studio/butler/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, preferReuse }),
    })
  }

  function messages(sessionId: string): string[] {
    const rows = db.prepare('SELECT content FROM messages WHERE session_id = ? ORDER BY id').all(sessionId) as Array<{ content: string }>
    return rows.map(row => row.content)
  }

  it('serves the bundled example index', async () => {
    const response = await fetch(`${base}/api/studio/butler/index`)
    expect(response.status).toBe(200)
    const body = await response.json() as any
    expect(body.source).toBe('example')
    expect(body.path).toBeNull()
    expect(body.projects.map((project: { projectKey: string }) => project.projectKey)).toEqual([
      'value-added/xmglpt',
      'procurement/office-supplies',
    ])
    expect(JSON.stringify(body)).not.toMatch(/jdbc:|password\s*[:=]/i)
  })

  it('creates a session for the golden request and reuses it', async () => {
    const created = await post(GOLDEN)
    expect(created.status).toBe(200)
    const first = await created.json() as any
    expect(first.decision).toBe('created')
    expect(first.intent).toMatchObject({
      businessLine: 'value-added',
      projectKey: 'value-added/xmglpt',
      env: 'prod-ro',
      needsDatabase: true,
      action: 'query',
    })
    expect(first.intent.tags).toEqual(expect.arrayContaining(['电子档案', '线上问题']))
    expect(first.session).toMatchObject({
      kind: 'chat',
      projectKey: 'value-added/xmglpt',
      env: 'prod-ro',
      workdir: 'value-added/xmglpt',
      status: 'active',
      profile: 'default',
    })
    expect(first.contextPack.databases).toEqual([
      expect.objectContaining({
        alias: 'xmglpt-prod-ro',
        env: 'prod-ro',
        readOnly: true,
        credentialValidToday: true,
      }),
    ])
    expect(first.contextPack.groupSuggestion).toMatchObject({ roomId: 'ops-room-demo', action: 'suggest' })
    expect(first.focus).toMatchObject({
      routeName: 'hermes.session',
      desktopBridge: 'hermesDesktop.openChatWindow',
      desktopLaunch: 'client-only',
    })
    expect(first.message.content).toContain(GOLDEN)
    expect(first.message.content).toContain('workdir=value-added/xmglpt')
    expect(first.message.content).toContain('alias=xmglpt-prod-ro')
    expect(first.message.content).toContain('credentialValidToday=true')
    expect(first.message.content).toContain('只读')
    expect(JSON.stringify(first.contextPack)).not.toMatch(/jdbc:|connectionString|"password"/i)
    expect(first.message.content).not.toMatch(/jdbc:|[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i)

    const reused = await post(GOLDEN)
    const second = await reused.json() as any
    expect(second.decision).toBe('reused')
    expect(second.session.sessionId).toBe(first.session.sessionId)
    expect(messages(first.session.sessionId)).toHaveLength(2)
    const stored = db.prepare('SELECT kind, project_key, env, status, workdir FROM butler_session_registry WHERE session_id = ?').get(first.session.sessionId) as { kind: string; project_key: string; status: string }
    expect(stored).toMatchObject({ kind: 'chat', project_key: 'value-added/xmglpt', status: 'active' })
  })

  it('rejects the procurement line without creating a session', async () => {
    const response = await post('帮我看采购线今天线上有哪些合同')
    expect(response.status).toBe(422)
    const body = await response.json() as any
    expect(body).toMatchObject({
      ok: false,
      code: 'procurement_rejected',
      intent: { projectKey: 'procurement/office-supplies', rejectCode: 'procurement_rejected' },
    })
    expect(db.prepare('SELECT COUNT(*) AS count FROM sessions').get()).toEqual({ count: 0 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM butler_session_registry').get()).toEqual({ count: 0 })
  })

  it('drops secret fields from the context pack and stored message', async () => {
    const indexPath = join(root, 'projects.index.json')
    await writeFile(indexPath, JSON.stringify({
      schemaVersion: 1,
      password: SECRET,
      projects: [{
        projectKey: 'value-added/xmglpt',
        displayName: '项目管理平台',
        aliases: ['项目管理平台'],
        businessLine: 'value-added',
        workdir: 'value-added/xmglpt',
        groupRoomId: 'ops-room-demo',
        databases: [{
          alias: 'xmglpt-prod-ro',
          env: 'prod-ro',
          readOnly: true,
          credentialVersion: 'demo-version',
          credentialValidToday: true,
          password: SECRET,
          jdbcUrl: `jdbc:mysql://fixture-user:${SECRET}@db.invalid/app`,
          connectionString: `mysql://fixture-user:${SECRET}@db.invalid/app`,
        }],
      }],
    }))
    process.env.BUTLER_PROJECTS_INDEX = indexPath
    const response = await post(`${GOLDEN} password=${SECRET}`)
    expect(response.status).toBe(200)
    const body = await response.json() as any
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain(SECRET)
    expect(serialized).not.toContain('jdbc:')
    expect(serialized).not.toContain('mysql://')
    expect(body.contextPack.databases[0]).toEqual({
      alias: 'xmglpt-prod-ro',
      env: 'prod-ro',
      readOnly: true,
      credentialVersion: 'demo-version',
      credentialValidToday: true,
    })
    expect(Object.keys(body.contextPack.databases[0]).sort()).toEqual([
      'alias',
      'credentialValidToday',
      'credentialVersion',
      'env',
      'readOnly',
    ])
    const stored = messages(body.session.sessionId).join('\n')
    expect(stored).not.toContain(SECRET)
    expect(stored).not.toContain('jdbc:')
    expect(stored).toContain('alias=xmglpt-prod-ro')
    expect(stored).toContain('[redacted]')
  })
})
