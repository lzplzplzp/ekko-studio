import { randomUUID } from 'node:crypto'
import { addMessage, createSession, getSession, updateSessionStats } from '../../repositories/session-store'
import { buildContextPack, renderButlerMessage } from './context-pack'
import { parseButlerIntent, projectForIntent } from './intent'
import { loadProjectIndex, publicIndexPath } from './project-index'
import { closeRegistryEntry, findActiveChat, listRegistryEntries, saveRegistryEntry } from './registry'
import { assertNoSecretMaterial, redactSecrets } from './secrets'
import {
  ButlerIndexError,
  type ButlerEnv,
  type ButlerIntent,
  type ButlerRouteResult,
  type ButlerSessionRef,
  type ProjectRecord,
} from './types'

const SESSION_PROFILE = 'default'

function failure(status: number, code: string, error: string, intent?: ButlerIntent): ButlerRouteResult {
  return { ok: false, status, code, error, ...(intent ? { intent } : {}) }
}

function publicIntent(intent: ButlerIntent): ButlerIntent {
  return { ...intent, text: redactSecrets(intent.text) }
}

function sessionTitle(project: ProjectRecord, env: ButlerEnv): string {
  const label = env === 'prod-ro' ? '线上只读' : env === 'staging' ? '预发' : '测试'
  return `${project.displayName} · ${label}`
}

function openStudioSession(project: ProjectRecord, title: string): string {
  const id = randomUUID()
  createSession({
    id,
    profile: SESSION_PROFILE,
    source: 'builtin_agent',
    agent: 'ekko-agent',
    title,
    workspace: project.workdir,
  })
  return id
}

function publishRegistry(session: ButlerSessionRef, groupRoomId: string): void {
  saveRegistryEntry({
    sessionId: session.sessionId,
    kind: 'chat',
    projectKey: session.projectKey,
    env: session.env,
    tags: session.tags,
    workdir: session.workdir,
    lastActiveAt: session.lastActiveAt,
    status: 'active',
    title: session.title,
    groupRoomId,
    createdAt: session.lastActiveAt,
  })
}

export function describeButlerIndex() {
  const loaded = loadProjectIndex()
  return {
    source: loaded.source,
    path: publicIndexPath(loaded),
    redactedFieldNames: loaded.redactedFieldNames,
    projects: loaded.projects.map(project => ({
      projectKey: project.projectKey,
      displayName: project.displayName,
      businessLine: project.businessLine,
      workdir: project.workdir,
      archived: project.archived,
      readOnly: project.readOnly,
      groupRoomId: project.groupRoomId,
      databases: project.databases,
    })),
  }
}

export function listButlerRegistry() {
  return listRegistryEntries()
}

export function routeButlerUtterance(input: { text: string; preferReuse?: boolean }): ButlerRouteResult {
  const raw = input.text.trim()
  if (!raw) return failure(400, 'invalid_request', 'text is required')

  let loaded
  try {
    loaded = loadProjectIndex()
  } catch (error) {
    if (error instanceof ButlerIndexError) return failure(error.status, error.code, error.message)
    return failure(500, 'butler_failed', 'Butler routing failed')
  }

  const parsed = parseButlerIntent(raw, loaded.projects)
  const intent = publicIntent(parsed)
  if (parsed.rejectCode === 'procurement_rejected') {
    return failure(422, 'procurement_rejected', 'Procurement projects are outside the ops butler.', intent)
  }

  const project = projectForIntent(parsed, loaded.projects)
  if (!project || !parsed.projectKey) {
    return failure(422, 'project_unresolved', 'No project in the index matched this request.', intent)
  }
  if (!parsed.env) {
    return failure(422, 'env_unresolved', 'Could not tell which environment this request targets.', intent)
  }

  const pack = buildContextPack(project, { ...parsed, env: parsed.env })
  const content = renderButlerMessage(intent.text, pack)
  try {
    assertNoSecretMaterial({ intent, contextPack: pack, message: content })
  } catch {
    return failure(500, 'butler_failed', 'Butler routing failed')
  }

  const now = Math.floor(Date.now() / 1000)
  const title = sessionTitle(project, parsed.env)
  const preferReuse = input.preferReuse !== false
  let decision: 'created' | 'reused' = 'created'
  let sessionId = ''

  if (preferReuse) {
    const existing = findActiveChat(project.projectKey, parsed.env)
    if (existing && getSession(existing.sessionId)) {
      sessionId = existing.sessionId
      decision = 'reused'
    } else if (existing) {
      closeRegistryEntry(existing.sessionId)
    }
  }
  if (!sessionId) {
    sessionId = openStudioSession(project, title)
  }

  const messageId = addMessage({ session_id: sessionId, role: 'user', content })
  if (messageId == null) return failure(500, 'butler_failed', 'Butler routing failed')
  updateSessionStats(sessionId)

  const session: ButlerSessionRef = {
    sessionId,
    kind: 'chat',
    projectKey: project.projectKey,
    env: parsed.env,
    tags: intent.tags,
    workdir: project.workdir,
    lastActiveAt: now,
    status: 'active',
    title,
    profile: SESSION_PROFILE,
  }
  publishRegistry(session, project.groupRoomId)

  return {
    ok: true,
    decision,
    intent,
    session,
    contextPack: pack,
    message: { role: 'user', content },
    focus: {
      sessionId,
      profile: SESSION_PROFILE,
      routeName: 'hermes.session',
      hashPath: `/#/hermes/session/${sessionId}`,
      desktopBridge: 'hermesDesktop.openChatWindow',
      desktopLaunch: 'client-only',
    },
  }
}
