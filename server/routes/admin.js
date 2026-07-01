import { Router } from 'express'
import GlobalConfig from '../models/GlobalConfig.js'
import User from '../models/User.js'
import QueryLog from '../models/QueryLog.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()
const ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 min

// ---- Public ----

// GET /api/admin/config — public, returns global status + adminContact
router.get('/config', async (req, res) => {
  try {
    let cfg = await GlobalConfig.findById('global').lean()
    if (!cfg) cfg = { _id: 'global', uapiKey: '', deepseekKey: '', enabled: false, adminContact: '' }
    res.json({
      enabled: cfg.enabled,
      hasUapi: cfg.enabled && !!cfg.uapiKey,
      hasDeepseek: cfg.enabled && !!cfg.deepseekKey,
      adminContact: cfg.adminContact || ''
    })
  } catch { res.status(500).json({ error: '获取配置失败' }) }
})

// GET /api/admin/me — returns role + useGlobal flag
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role email useGlobal')
    if (!user) return res.status(404).json({ error: '用户不存在' })
    res.json({ role: user.role, email: user.email, useGlobal: user.useGlobal || false })
  } catch { res.status(500).json({ error: '获取信息失败' }) }
})

// POST /api/admin/heartbeat
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
    if (!cfg) cfg = await GlobalConfig.create({ _id: 'global', uapiKey: '', deepseekKey: '', enabled: false, adminContact: '' })
    res.json(cfg)
  } catch { res.status(500).json({ error: '获取配置失败' }) }
})

// PUT /api/admin/config
router.put('/config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { uapiKey, deepseekKey, enabled, adminContact } = req.body
    const update = {}
    if (uapiKey !== undefined) update.uapiKey = String(uapiKey).trim()
    if (deepseekKey !== undefined) update.deepseekKey = String(deepseekKey).trim()
    if (enabled !== undefined) update.enabled = !!enabled
    if (adminContact !== undefined) update.adminContact = String(adminContact).trim()
    const cfg = await GlobalConfig.findByIdAndUpdate('global', { $set: update }, { upsert: true, new: true })
    res.json(cfg)
  } catch { res.status(500).json({ error: '保存配置失败' }) }
})

// GET /api/admin/users — with search
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || '').trim()
    const filter = search ? { email: { $regex: search, $options: 'i' } } : {}
    const users = await User.find(filter).select('email role useGlobal lastActive createdAt').sort({ createdAt: -1 }).lean()
    const now = Date.now()
    const data = users.map(u => ({
      _id: u._id, email: u.email, role: u.role, useGlobal: u.useGlobal || false,
      createdAt: u.createdAt, lastActive: u.lastActive,
      online: (now - new Date(u.lastActive).getTime()) < ONLINE_THRESHOLD
    }))
    res.json(data)
  } catch { res.status(500).json({ error: '获取用户失败' }) }
})

// PUT /api/admin/users/:id/global — toggle per-user global
router.put('/users/:id/global', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { useGlobal } = req.body
    await User.findByIdAndUpdate(req.params.id, { $set: { useGlobal: !!useGlobal } })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: '更新失败' }) }
})

// GET /api/admin/queries
router.get('/queries', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const logs = await QueryLog.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    res.json(logs)
  } catch { res.status(500).json({ error: '获取查询记录失败' }) }
})

// GET /api/admin/queries/export — CSV export
router.get('/queries/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await QueryLog.find({}).sort({ createdAt: -1 }).limit(1000).lean()
    // Build CSV with BOM for Excel UTF-8
    let csv = '﻿查询时间,查询人,类型,快递单号,快递公司,状态,IP\n'
    for (const q of logs) {
      const time = q.createdAt ? new Date(q.createdAt).toLocaleString('zh-CN') : ''
      const who = q.isGuest ? '游客' : (q.email || '未知')
      const status = q.success ? '成功' : '失败'
      const carrier = q.carrier || '-'
      csv += `"${time}","${who}","${q.isGuest ? '游客查询' : '登录用户'}","${q.trackingNumber}","${carrier}","${status}","${q.ip || ''}"\n`
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=查询记录_' + new Date().toISOString().slice(0, 10) + '.csv')
    res.end(csv)
  } catch { res.status(500).json({ error: '导出失败' }) }
})

// POST /api/admin/test-uapi — quick API key test (5s timeout), bypasses proxy
router.post('/test-uapi', authMiddleware, adminMiddleware, async (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: '缺少密钥' })
  try {
    const https = (await import('https')).default
    const directAgent = new https.Agent({ keepAlive: true })
    const auth = key.startsWith('uapi-') ? 'Bearer ' + key : 'Bearer uapi-' + key
    const uapiReq = https.get('https://uapis.cn/api/v1/misc/tracking/query?tracking_number=JT0000000000', {
      headers: { Authorization: auth, Accept: 'application/json' },
      timeout: 5000,
      agent: directAgent
    }, (proxyRes) => {
      if (res.writableEnded) return
      if (proxyRes.statusCode === 401 || proxyRes.statusCode === 403) {
        return res.json({ ok: false, msg: '密钥无效 (' + proxyRes.statusCode + ')' })
      }
      res.json({ ok: true, msg: '连接成功 (' + proxyRes.statusCode + ')' })
    })
    uapiReq.on('timeout', () => { uapiReq.destroy(); if (!res.writableEnded) res.json({ ok: false, msg: 'UAPI 服务超时，请稍后重试' }) })
    uapiReq.on('error', () => { if (!res.writableEnded) res.json({ ok: false, msg: 'UAPI 服务不可达' }) })
  } catch { res.json({ ok: false, msg: '测试失败' }) }
})

export default router
