import type { ButlerEnv, ButlerIntent, ProjectRecord } from './types'

const DB_HINT = /合同|失败|档案|数据库|查库|查询|推送|推新|记录|有哪些|\bsql\b|\bselect\b/i

function isProcurementProject(project: ProjectRecord): boolean {
  return project.businessLine === 'procurement' || project.projectKey.startsWith('procurement/')
}

function matchProject(text: string, projects: ProjectRecord[]): ProjectRecord | null {
  let best: { project: ProjectRecord; length: number; index: number } | null = null
  for (const project of projects) {
    const names = [
      project.displayName,
      project.projectKey,
      project.projectKey.split('/').pop() || '',
      ...project.aliases,
    ]
    for (const name of names) {
      const alias = name.trim()
      if (alias.length < 2) continue
      const index = text.indexOf(alias)
      if (index < 0) continue
      if (!best || alias.length > best.length || (alias.length === best.length && index < best.index)) {
        best = { project, length: alias.length, index }
      }
    }
  }
  return best?.project ?? null
}

export function detectButlerEnv(text: string): ButlerEnv | null {
  if (/线上|生产|正式/.test(text) || /\bprod(?:uction)?\b/i.test(text)) return 'prod-ro'
  if (/预发|预发布|\bstaging\b/i.test(text)) return 'staging'
  if (/测试|\btest\b/i.test(text)) return 'test'
  return null
}

function intentTags(text: string, env: ButlerEnv | null): string[] {
  const tags: string[] = []
  if (/电子档案|档案/.test(text)) tags.push('电子档案')
  if (env === 'prod-ro' && /失败|问题|运维|推新|线上/.test(text)) tags.push('线上问题')
  return tags
}

export function parseButlerIntent(text: string, projects: ProjectRecord[]): ButlerIntent {
  const project = matchProject(text, projects)
  const procurementText = /采购线|采购项目|procurement\//i.test(text)
  const rejected = (!!project && isProcurementProject(project)) || (!project && procurementText)
  const env = detectButlerEnv(text)
  const needsDatabase = DB_HINT.test(text)
  return {
    text,
    businessLine: project?.businessLine ?? (rejected ? 'procurement' : null),
    projectKey: !rejected ? (project?.projectKey ?? null) : (project?.projectKey ?? 'procurement'),
    displayName: project?.displayName ?? null,
    env,
    needsDatabase,
    action: needsDatabase ? 'query' : 'inspect',
    tags: intentTags(text, env),
    preferGroup: !rejected && env === 'prod-ro' && !!project?.groupRoomId && /线上|失败|运维|问题/.test(text),
    rejectCode: rejected ? 'procurement_rejected' : null,
  }
}

export function projectForIntent(intent: ButlerIntent, projects: ProjectRecord[]): ProjectRecord | null {
  if (!intent.projectKey || intent.rejectCode) return null
  return projects.find(project => project.projectKey === intent.projectKey) ?? null
}
