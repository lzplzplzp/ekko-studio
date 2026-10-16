export const BUTLER_ENVS = ['test', 'staging', 'prod-ro'] as const
export type ButlerEnv = (typeof BUTLER_ENVS)[number]

export const BUTLER_KINDS = ['chat', 'group', 'workflow'] as const
export type ButlerKind = (typeof BUTLER_KINDS)[number]

export interface ProjectDatabase {
  alias: string
  env: ButlerEnv
  readOnly: boolean
  credentialVersion: string
  credentialValidToday: boolean
}

export interface ProjectRecord {
  projectKey: string
  displayName: string
  aliases: string[]
  businessLine: string
  workdir: string
  archived: boolean
  readOnly: boolean
  tags: string[]
  agentProfile: string
  groupRoomId: string
  databases: ProjectDatabase[]
}

export interface LoadedProjectIndex {
  source: 'env' | 'state' | 'cwd' | 'example'
  path: string
  projects: ProjectRecord[]
  redactedFieldNames: string[]
}

export interface ButlerIntent {
  text: string
  businessLine: string | null
  projectKey: string | null
  displayName: string | null
  env: ButlerEnv | null
  needsDatabase: boolean
  action: 'query' | 'inspect'
  tags: string[]
  preferGroup: boolean
  rejectCode: 'procurement_rejected' | null
}

export interface GroupSuggestion {
  roomId: string
  action: 'suggest'
  reason: string
}

export interface ContextPack {
  projectKey: string
  businessLine: string
  workdir: string
  env: ButlerEnv
  readOnly: boolean
  archived: boolean
  guardrails: string[]
  databases: ProjectDatabase[]
  groupSuggestion: GroupSuggestion | null
}

export interface ButlerSessionRef {
  sessionId: string
  kind: 'chat'
  projectKey: string
  env: ButlerEnv
  tags: string[]
  workdir: string
  lastActiveAt: number
  status: 'active'
  title: string
  profile: string
}

export interface ButlerFocus {
  sessionId: string
  profile: string
  routeName: 'hermes.session'
  hashPath: string
  desktopBridge: 'hermesDesktop.openChatWindow'
  desktopLaunch: 'client-only'
}

export interface ButlerRouteSuccess {
  ok: true
  decision: 'created' | 'reused'
  intent: ButlerIntent
  session: ButlerSessionRef
  contextPack: ContextPack
  message: { role: 'user'; content: string }
  focus: ButlerFocus
}

export interface ButlerRouteFailure {
  ok: false
  status: number
  code: string
  error: string
  intent?: ButlerIntent
}

export type ButlerRouteResult = ButlerRouteSuccess | ButlerRouteFailure

export class ButlerIndexError extends Error {
  readonly code: 'index_missing' | 'index_invalid'
  readonly status: number

  constructor(code: 'index_missing' | 'index_invalid', message: string, status: number) {
    super(message)
    this.name = 'ButlerIndexError'
    this.code = code
    this.status = status
  }
}
