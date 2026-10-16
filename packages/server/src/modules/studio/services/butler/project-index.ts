import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, resolve, win32, posix } from 'node:path'
import { config } from '../../public/config'
import { BUTLER_ENVS, ButlerIndexError, type ButlerEnv, type LoadedProjectIndex, type ProjectDatabase, type ProjectRecord } from './types'
import { hasSecretMaterial, isSecretKey } from './secrets'

const PROJECT_KEY = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/

function moduleDir(): string | null {
  try {
    return __dirname
  } catch {
    return null
  }
}

function bundledExamplePath(): string {
  const here = moduleDir()
  const candidates = [
    ...(here ? [resolve(here, 'projects.index.example.json')] : []),
    resolve(process.cwd(), 'packages/server/src/modules/studio/services/butler/projects.index.example.json'),
  ]
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) throw new ButlerIndexError('index_missing', 'Bundled butler project index example is missing.', 404)
  return found
}

export function resolveProjectIndexPath(
  env: NodeJS.ProcessEnv = process.env,
  appHome = config.appHome,
  cwd = process.cwd(),
): { path: string; source: LoadedProjectIndex['source'] } {
  const fromEnv = env.BUTLER_PROJECTS_INDEX?.trim()
  if (fromEnv) return { path: isAbsolute(fromEnv) ? fromEnv : resolve(cwd, fromEnv), source: 'env' }
  const statePath = join(appHome, 'butler', 'projects.index.json')
  if (existsSync(statePath)) return { path: statePath, source: 'state' }
  const cwdPath = join(cwd, 'projects.index.json')
  if (existsSync(cwdPath)) return { path: cwdPath, source: 'cwd' }
  return { path: bundledExamplePath(), source: 'example' }
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max || hasSecretMaterial(trimmed)) return null
  return trimmed
}

function cleanWorkdir(value: unknown): string | null {
  const workdir = cleanText(value, 500)
  if (!workdir) return null
  const segments = workdir.split(/[\\/]+/)
  if (segments.includes('..')) return null
  return workdir
}

function cleanStringList(value: unknown, maxItem: number): string[] {
  if (!Array.isArray(value)) return []
  const items: string[] = []
  for (const entry of value) {
    const text = cleanText(entry, maxItem)
    if (text && !items.includes(text)) items.push(text)
  }
  return items
}

function isButlerEnv(value: string): value is ButlerEnv {
  return (BUTLER_ENVS as readonly string[]).includes(value)
}

function readDatabase(value: unknown, redacted: Set<string>): ProjectDatabase | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (isSecretKey(key)) redacted.add(key)
  }
  const alias = cleanText(record.alias, 120)
  const env = cleanText(record.env, 32)
  if (!alias || !env || !isButlerEnv(env)) return null
  const credentialVersion = cleanText(record.credentialVersion, 64) || 'unspecified'
  return {
    alias,
    env,
    readOnly: record.readOnly === undefined ? env === 'prod-ro' : record.readOnly === true,
    credentialVersion,
    credentialValidToday: record.credentialValidToday === true,
  }
}

function readProject(value: unknown, redacted: Set<string>): ProjectRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (isSecretKey(key)) redacted.add(key)
  }
  const projectKey = cleanText(record.projectKey, 120)
  const displayName = cleanText(record.displayName, 120)
  const businessLine = cleanText(record.businessLine, 64)
  const workdir = cleanWorkdir(record.workdir)
  if (!projectKey || !PROJECT_KEY.test(projectKey) || !displayName || !businessLine || !workdir) return null
  const databases = Array.isArray(record.databases)
    ? record.databases.map(entry => readDatabase(entry, redacted)).filter((entry): entry is ProjectDatabase => !!entry)
    : []
  return {
    projectKey,
    displayName,
    aliases: cleanStringList(record.aliases, 80),
    businessLine,
    workdir,
    archived: record.archived === true,
    readOnly: record.readOnly === true,
    tags: cleanStringList(record.tags, 40),
    agentProfile: cleanText(record.agentProfile, 80) || '',
    groupRoomId: cleanText(record.groupRoomId, 120) || '',
    databases,
  }
}

export function loadProjectIndex(
  env: NodeJS.ProcessEnv = process.env,
  appHome = config.appHome,
  cwd = process.cwd(),
): LoadedProjectIndex {
  const located = resolveProjectIndexPath(env, appHome, cwd)
  if (!existsSync(located.path)) {
    throw new ButlerIndexError('index_missing', 'Butler project index file was not found.', 404)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(located.path, 'utf8'))
  } catch {
    throw new ButlerIndexError('index_invalid', 'Butler project index is not valid JSON.', 422)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ButlerIndexError('index_invalid', 'Butler project index does not match the expected object shape.', 422)
  }
  const body = parsed as Record<string, unknown>
  if (body.schemaVersion !== 1 || !Array.isArray(body.projects)) {
    throw new ButlerIndexError('index_invalid', 'Butler project index must use schemaVersion 1 and a projects array.', 422)
  }
  const redacted = new Set<string>()
  for (const key of Object.keys(body)) {
    if (isSecretKey(key)) redacted.add(key)
  }
  const projects = body.projects.map(entry => readProject(entry, redacted)).filter((entry): entry is ProjectRecord => !!entry)
  if (projects.length === 0) {
    throw new ButlerIndexError('index_invalid', 'Butler project index does not contain a usable project.', 422)
  }
  return {
    source: located.source,
    path: located.path,
    projects,
    redactedFieldNames: [...redacted].sort(),
  }
}

export function publicIndexPath(loaded: LoadedProjectIndex): string | null {
  if (loaded.source === 'example') return null
  const normalized = loaded.path.split(win32.sep).join(posix.sep)
  return normalized
}
