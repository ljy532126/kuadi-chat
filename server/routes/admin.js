import { Router } from 'express'
import GlobalConfig from '../models/GlobalConfig.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

// GET /api/admin/config — anyone (for frontend to know if global keys are on)
router.get('/config', async (req, res) => {
  try {
    let cfg = await GlobalConfig.findById('global').lean()
    if (!cfg) {
      cfg = { _id: 'global', uapiKey: '', deepseekKey: '', enabled: false }
    }
    // Only expose keys to frontend if enabled
    res.json({
      enabled: cfg.enabled,
      hasUapi: cfg.enabled && !!cfg.uapiKey,
      hasDeepseek: cfg.enabled && !!cfg.deepseekKey
    })
  } catch (e) {
    res.status(500).json({ error: '获取配置失败' })
  }
})

// GET /api/admin/config/full — admin only, returns full config with keys
router.get('/config/full', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let cfg = await GlobalConfig.findById('global').lean()
    if (!cfg) {
      cfg = await GlobalConfig.create({ _id: 'global', uapiKey: '', deepseekKey: '', enabled: false })
    }
    res.json(cfg)
  } catch (e) {
    res.status(500).json({ error: '获取配置失败' })
  }
})

// PUT /api/admin/config — admin only
router.put('/config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { uapiKey, deepseekKey, enabled } = req.body
    const update = {}
    if (uapiKey !== undefined) update.uapiKey = String(uapiKey).trim()
    if (deepseekKey !== undefined) update.deepseekKey = String(deepseekKey).trim()
    if (enabled !== undefined) update.enabled = !!enabled

    const cfg = await GlobalConfig.findByIdAndUpdate(
      'global',
      { $set: update },
      { upsert: true, new: true }
    )
    res.json(cfg)
  } catch (e) {
    res.status(500).json({ error: '保存配置失败' })
  }
})

// GET /api/admin/me — check if current user is admin
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default
    const user = await User.findById(req.userId).select('role email')
    if (!user) return res.status(404).json({ error: '用户不存在' })
    res.json({ role: user.role, email: user.email })
  } catch {
    res.status(500).json({ error: '获取信息失败' })
  }
})

export default router
