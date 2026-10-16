import { getDb, isSqliteAvailable } from '../../infrastructure/database'
import { BUTLER_SESSION_REGISTRY_TABLE } from '../../infrastructure/database/schemas'
import type { ButlerEnv, ButlerKind } from './types'

export interface RegistryEntry {
  sessionId: string
  kind: ButlerKind
  projectKey: string
  env: ButlerEnv
  tags: string[]
  workdir: string
  lastActiveAt: number
  status: 'active' | 'closed'
  title: string
  groupRoomId: string
  createdAt: number
}

function requireDb() {
  if (!isSqliteAvailable()) throw new Error('Butler registry requires SQLite')
  const db = getDb()
  if (!db) throw new Error('Butler registry requires SQLite')
  return db
}

function parseTags(value: unknown): string[] {
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function mapRow(row: Record<string, unknown>): RegistryEntry {
  const kind = row.kind === 'group' || row.kind === 'workflow' ? row.kind : 'chat'
  const env = row.env === 'test' || row.env === 'staging' || row.env === 'prod-ro' ? row.env : 'test'
  return {
    sessionId: String(row.session_id || ''),
    kind,
    projectKey: String(row.project_key || ''),
    env,
    tags: parseTags(row.tags),
    workdir: String(row.workdir || ''),
    lastActiveAt: Number(row.last_active_at || 0),
    status: row.status === 'closed' ? 'closed' : 'active',
    title: String(row.title || ''),
    groupRoomId: String(row.group_room_id || ''),
    createdAt: Number(row.created_at || 0),
  }
}

export function findActiveChat(projectKey: string, env: ButlerEnv): RegistryEntry | null {
  const row = requireDb().prepare(
    `SELECT * FROM ${BUTLER_SESSION_REGISTRY_TABLE}
     WHERE project_key = ? AND env = ? AND kind = 'chat' AND status = 'active'
     ORDER BY last_active_at DESC
     LIMIT 1`,
  ).get(projectKey, env) as Record<string, unknown> | undefined
  return row ? mapRow(row) : null
}

export function saveRegistryEntry(entry: RegistryEntry): void {
  const now = entry.createdAt || Math.floor(Date.now() / 1000)
  requireDb().prepare(
    `INSERT INTO ${BUTLER_SESSION_REGISTRY_TABLE}
      (session_id, kind, project_key, env, tags, workdir, last_active_at, status, title, group_room_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
      kind = excluded.kind,
      project_key = excluded.project_key,
      env = excluded.env,
      tags = excluded.tags,
      workdir = excluded.workdir,
      last_active_at = excluded.last_active_at,
      status = excluded.status,
      title = excluded.title,
      group_room_id = excluded.group_room_id`,
  ).run(
    entry.sessionId,
    entry.kind,
    entry.projectKey,
    entry.env,
    JSON.stringify(entry.tags),
    entry.workdir,
    entry.lastActiveAt,
    entry.status,
    entry.title,
    entry.groupRoomId,
    now,
  )
}

export function closeRegistryEntry(sessionId: string): void {
  requireDb().prepare(
    `UPDATE ${BUTLER_SESSION_REGISTRY_TABLE} SET status = 'closed' WHERE session_id = ?`,
  ).run(sessionId)
}

export function listRegistryEntries(): RegistryEntry[] {
  const rows = requireDb().prepare(
    `SELECT * FROM ${BUTLER_SESSION_REGISTRY_TABLE} ORDER BY last_active_at DESC, session_id ASC`,
  ).all() as Record<string, unknown>[]
  return rows.map(mapRow)
}
