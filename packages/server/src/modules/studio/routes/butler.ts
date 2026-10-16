import Router from '@koa/router'
import * as ctrl from '../controllers/butler'

export const butlerRoutes = new Router()

butlerRoutes.get('/api/studio/butler/index', ctrl.index)
butlerRoutes.get('/api/studio/butler/registry', ctrl.registry)
butlerRoutes.post('/api/studio/butler/route', ctrl.route)
