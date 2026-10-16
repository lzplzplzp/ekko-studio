import { ButlerIndexError } from '../services/butler/types'
import { describeButlerIndex, listButlerRegistry, routeButlerUtterance } from '../services/butler/service'

function writeIndexError(ctx: any, error: unknown): void {
  if (error instanceof ButlerIndexError) {
    ctx.status = error.status
    ctx.body = { ok: false, code: error.code, error: error.message }
    return
  }
  ctx.status = 500
  ctx.body = { ok: false, code: 'butler_failed', error: 'Butler routing failed' }
}

export function index(ctx: any): void {
  try {
    ctx.body = describeButlerIndex()
  } catch (error) {
    writeIndexError(ctx, error)
  }
}

export function registry(ctx: any): void {
  try {
    ctx.body = { entries: listButlerRegistry() }
  } catch {
    ctx.status = 500
    ctx.body = { ok: false, code: 'butler_failed', error: 'Butler routing failed' }
  }
}

export function route(ctx: any): void {
  const body = (ctx.request.body ?? {}) as { text?: unknown; preferReuse?: unknown }
  try {
    const result = routeButlerUtterance({
      text: typeof body.text === 'string' ? body.text : '',
      preferReuse: body.preferReuse !== false,
    })
    if (!result.ok) {
      ctx.status = result.status
      ctx.body = { ok: false, code: result.code, error: result.error, ...(result.intent ? { intent: result.intent } : {}) }
      return
    }
    ctx.body = result
  } catch {
    ctx.status = 500
    ctx.body = { ok: false, code: 'butler_failed', error: 'Butler routing failed' }
  }
}
