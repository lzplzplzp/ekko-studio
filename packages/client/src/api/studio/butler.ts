import { request } from '../client'

export interface ButlerDatabaseStatus {
  alias: string
  env: 'test' | 'staging' | 'prod-ro'
  readOnly: boolean
  credentialVersion: string
  credentialValidToday: boolean
}

export interface ButlerRouteSuccess {
  ok: true
  decision: 'created' | 'reused'
  intent: {
    text: string
    businessLine: string | null
    projectKey: string | null
    displayName: string | null
    env: 'test' | 'staging' | 'prod-ro' | null
    needsDatabase: boolean
    action: 'query' | 'inspect'
    tags: string[]
    preferGroup: boolean
    rejectCode: string | null
  }
  session: {
    sessionId: string
    kind: 'chat'
    projectKey: string
    env: 'test' | 'staging' | 'prod-ro'
    tags: string[]
    workdir: string
    lastActiveAt: number
    status: 'active'
    title: string
    profile: string
  }
  contextPack: {
    projectKey: string
    businessLine: string
    workdir: string
    env: 'test' | 'staging' | 'prod-ro'
    readOnly: boolean
    archived: boolean
    guardrails: string[]
    databases: ButlerDatabaseStatus[]
    groupSuggestion: { roomId: string; action: 'suggest'; reason: string } | null
  }
  message: { role: 'user'; content: string }
  focus: {
    sessionId: string
    profile: string
    routeName: 'hermes.session'
    hashPath: string
    desktopBridge: 'hermesDesktop.openChatWindow'
    desktopLaunch: 'client-only'
  }
}

export interface ButlerIndexInfo {
  source: 'env' | 'state' | 'cwd' | 'example'
  path: string | null
  redactedFieldNames: string[]
  projects: Array<{
    projectKey: string
    displayName: string
    businessLine: string
    workdir: string
    archived: boolean
    readOnly: boolean
    groupRoomId: string
    databases: ButlerDatabaseStatus[]
  }>
}

export function fetchButlerIndex(): Promise<ButlerIndexInfo> {
  return request<ButlerIndexInfo>('/api/studio/butler/index')
}

export function routeButler(text: string, preferReuse = true): Promise<ButlerRouteSuccess> {
  return request<ButlerRouteSuccess>('/api/studio/butler/route', {
    method: 'POST',
    body: JSON.stringify({ text, preferReuse }),
  })
}
