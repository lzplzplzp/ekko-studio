import type { ButlerEnv, ButlerIntent, ContextPack, ProjectRecord } from './types'

const GUARDRAILS = [
  '生产环境只读，禁止 DML/DDL。',
  '不要把密码、口令或连接串写入会话、日志或长期记忆。',
  'Production access is read-only. Do not run DML or DDL.',
  'Do not write passwords or connection strings into the session.',
]

export function buildContextPack(project: ProjectRecord, intent: ButlerIntent & { env: ButlerEnv }): ContextPack {
  const databases = project.databases.filter(database => database.env === intent.env)
  const readOnly = project.readOnly || project.archived || intent.env === 'prod-ro' || databases.some(database => database.readOnly)
  const guardrails = [...GUARDRAILS]
  if (project.archived) guardrails.push('归档项目默认只查不写。')
  if (readOnly) guardrails.push('此会话默认只读。')
  const groupSuggestion = intent.preferGroup && project.groupRoomId
    ? {
        roomId: project.groupRoomId,
        action: 'suggest' as const,
        reason: 'Online ops tasks suggest the configured ops room. This version still opens a single chat.',
      }
    : null
  return {
    projectKey: project.projectKey,
    businessLine: project.businessLine,
    workdir: project.workdir,
    env: intent.env,
    readOnly,
    archived: project.archived,
    guardrails,
    databases,
    groupSuggestion,
  }
}

export function renderButlerMessage(question: string, pack: ContextPack): string {
  const lines = [
    'Butler context',
    `question: ${question}`,
    `businessLine=${pack.businessLine}`,
    `projectKey=${pack.projectKey}`,
    `workdir=${pack.workdir}`,
    `env=${pack.env}`,
    `readOnly=${pack.readOnly}`,
    `archived=${pack.archived}`,
    'guardrails:',
    ...pack.guardrails.map(line => `- ${line}`),
  ]
  if (pack.databases.length === 0) {
    lines.push('databases: none for this environment')
  } else {
    lines.push('databases:')
    for (const database of pack.databases) {
      lines.push(
        `- alias=${database.alias} env=${database.env} readOnly=${database.readOnly} credentialVersion=${database.credentialVersion} credentialValidToday=${database.credentialValidToday}`,
      )
    }
  }
  if (pack.groupSuggestion) {
    lines.push(`groupSuggestion roomId=${pack.groupSuggestion.roomId} action=suggest`)
  }
  return lines.join('\n')
}
