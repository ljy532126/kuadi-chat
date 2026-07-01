import { Router } from 'express'
import GlobalConfig from '../models/GlobalConfig.js'
import User from '../models/User.js'
import QueryLog from '../models/QueryLog.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()
const ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 min

// ---- Public ----

// GET /api/admin/config
router.get('/config', async (req, res) => {
  try {
    let cfg = await GlobalConfig.findById('global').lean()
    if (!cfg) cfg = { _id: 'global', uapiKey: '', deepseekKey: '', enabled: false }
    res.json({ enabled: cfg.enabled, hasUapi: cfg.enabled && !!cfg.uapiKey, hasDeepseek: cfg.enabled && !!cfg.deepseekKey })
  } catch { res.status(500).json({ error: '获取配置失败' }) }
})

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role email')
    if (!user) return res.status(404).json({ error: '用户不存在' })
    res.json({ role: user.role, email: user.email })
  } catch { res.status(500).json({ error: '获取信息失败' }) }
})

// POST /api/admin/heartbeat — update lastActive
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $set: { lastActive: new Date() } })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: '心跳失败' }) }
})

// ---- Admin only ----

// GET /api/admin/config/full
router.get('/config/full', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let cfg = await GlobalConfig.findById('global').lean()
    if (!cfg) cfg = await GlobalConfig.create({ _id: 'global', uapiKey: '', deepseekKey: '', enabled: false })
    res.json(cfg)
  } catch { res.status(500).json({ error: '获取配置失败' }) }
})

// PUT /api/admin/config
router.put('/config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { uapiKey, deepseekKey, enabled } = req.body
    const update = {}
    if (uapiKey !== undefined) update.uapiKey = String(uapiKey).trim()
    if (deepseekKey !== undefined) update.deepseekKey = String(deepseekKey).trim()
    if (enabled !== undefined) update.enabled = !!enabled
    const cfg = await GlobalConfig.findByIdAndUpdate('global', { $set: update }, { upsert: true, new: true })
    res.json(cfg)
  } catch { res.status(500).json({ error: '保存配置失败' }) }
})

// GET /api/admin/users — list all users with online status
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('email role lastActive createdAt').sort({ createdAt: -1 }).lean()
    const now = Date.now()
    const data = users.map(u => ({
      _id: u._id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lastActive: u.lastActive,
      online: (now - new Date(u.lastActive).getTime()) < ONLINE_THRESHOLD
    }))
    res.json(data)
  } catch { res.status(500).json({ error: '获取用户失败' }) }
})

// GET /api/admin/queries — recent query logs
router.get('/queries', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const logs = await QueryLog.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    res.json(logs)
  } catch { res.status(500).json({ error: '获取查询记录失败' }) }
})

export default router
