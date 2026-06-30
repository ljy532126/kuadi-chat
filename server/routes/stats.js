import { Router } from 'express'
import Stat from '../models/Stat.js'

const router = Router()

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const all = await Stat.find().sort({ date: 1 }).lean()
    const date = today()
    const todayDoc = all.find(s => s.date === date) || {}

    const total = all.reduce((acc, s) => {
      acc.visits += s.visits || 0
      acc.queries += s.queries || 0
      acc.success += s.success || 0
      acc.failed += s.failed || 0
      if (s.byCarrier) {
            for (const k of Object.keys(s.byCarrier || {})) {
              acc.byCarrier[k] = (acc.byCarrier[k] || 0) + (s.byCarrier[k] || 0)
            }
          }
      return acc
    }, { visits: 0, queries: 0, success: 0, failed: 0, byCarrier: {} })

    res.json({
      totalVisits: total.visits,
      todayVisits: todayDoc.visits || 0,
      totalQueries: total.queries,
      todayQueries: todayDoc.queries || 0,
      successQueries: total.success,
      failedQueries: total.failed,
      byCarrier: total.byCarrier
    })
  } catch (e) {
    console.error('Stats fetch:', e.message)
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

// POST /api/stats/visit
router.post('/visit', async (req, res) => {
  try {
    const date = today()
    await Stat.findOneAndUpdate(
      { date },
      { $inc: { visits: 1 } },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch (e) {
    console.error('Stats visit:', e.message)
    res.status(500).json({ error: '记录失败' })
  }
})

// POST /api/stats/query
router.post('/query', async (req, res) => {
  try {
    const { success, carrier } = req.body
    const date = today()
    const inc = { $inc: { queries: 1, success: success ? 1 : 0, failed: success ? 0 : 1 } }
    if (carrier) {
      inc.$inc['byCarrier.' + carrier.replace(/\./g, '_')] = 1
    }
    await Stat.findOneAndUpdate({ date }, inc, { upsert: true })
    res.json({ ok: true })
  } catch (e) {
    console.error('Stats query:', e.message)
    res.status(500).json({ error: '记录失败' })
  }
})

// DELETE /api/stats — admin clear
router.delete('/', async (req, res) => {
  try {
    await Stat.deleteMany({})
    res.json({ ok: true })
  } catch (e) {
    console.error('Stats clear:', e.message)
    res.status(500).json({ error: '清除失败' })
  }
})

export default router
