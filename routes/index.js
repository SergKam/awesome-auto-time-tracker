import express from 'express'
import {read} from '../services/activeWindowTracker.js'

const asyncRoute = route => (req, res, next) =>
    Promise.resolve(route(req, res)).catch(next)


const router = express.Router()

router.get('/', asyncRoute(async function (req, res, next) {
  const filter = req.query.filter || ''

  const list = filter ? await read(filter) : await read()

  list.forEach(el =>
      el.duration =
          Math.max(10, (new Date(el.end_time) - new Date(el.start_time)) / 1000 | 0)
  )

  res.render('index', {headers: Object.keys(list[0]), list, filter})
}))

export default router
