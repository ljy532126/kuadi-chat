import { Router } from 'express'
import https from 'https'
import { verifyToken } from '../middleware/auth.js'
import { rateLimitMiddleware, consumeFreeQuery, getFreeQuota } from '../middleware/rateLimit.js'
import GlobalConfig from '../models/GlobalConfig.js'
import QueryLog from '../models/QueryLog.js'
import User from '../models/User.js'

const router = Router()

async function resolveUapiKey(req) {
  if (req.headers['x-use-global'] === '1') {
    const cfg = await GlobalConfig.findById('global').lean()
    if (cfg && cfg.enabled && cfg.uapiKey) {
      return 'Bearer ' + (cfg.uapiKey.startsWith('uapi-') ? cfg.uapiKey : 'uapi-' + cfg.uapiKey)
    }
  }
  return req.headers['x-uapi-key'] || ''
}

async function resolveDsKey(req) {
  if (req.headers['x-use-global'] === '1') {
    const cfg = await GlobalConfig.findById('global').lean()
    if (cfg && cfg.enabled && cfg.deepseekKey) return 'Bearer ' + cfg.deepseekKey
  }
  return req.headers['x-ds-key'] || ''
}

async function resolveUserEmail(header) {
  if (!header || !header.startsWith('Bearer ')) return 'anonymous'
  try {
    const p = verifyToken(header.slice(7))
    const user = await User.findById(p.userId).select('email').catch(() => null)
    return user ? user.email : 'anonymous'
  } catch { return 'anonymous' }
}

// UAPI proxy
router.get('/api/v1/misc/tracking/query', rateLimitMiddleware, async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const header = req.headers.authorization
  let isAuth = false
  if (header && header.startsWith('Bearer ')) {
    try { verifyToken(header.slice(7)); isAuth = true } catch {}
  }

  if (!isAuth) {
    const left = getFreeQuota(ip)
    if (left <= 0) {
      return res.status(429).json({
        error: 'free_quota_exhausted',
        message: '今日免费查询次数已用完（10次/天），请注册登录获取更多查询次数。'
      })
    }
    consumeFreeQuery(ip)
  }

  const targetUrl = 'https://uapis.cn/api/v1/misc/tracking/query?' + new URLSearchParams(req.query).toString()
  const uapiKey = await resolveUapiKey(req)
  const trackingNumber = req.query.tracking_number || ''

  const uapiReq = https.get(targetUrl, {
    headers: { 'Authorization': uapiKey, 'Accept': 'application/json' },
    timeout: 10000
  }, async (proxyRes) => {
    let body = ''
    proxyRes.on('data', chunk => body += chunk)
    proxyRes.on('end', async () => {
      const success = proxyRes.statusCode === 200

      // Log query
      try {
        const userEmail = await resolveUserEmail(header)
        const carrier = success ? (JSON.parse(body || '{}').carrier_name || '') : ''
        await QueryLog.create({ email: userEmail, trackingNumber, carrier, success, ip })
      } catch {}

      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' })
      try {
        const data = JSON.parse(body || '{}')
        data.free_queries_left = getFreeQuota(ip)
        res.end(JSON.stringify(data))
      } catch {
        res.end(JSON.stringify({ error: 'proxy_error', free_queries_left: getFreeQuota(ip) }))
      }
    })
  })
  uapiReq.on('timeout', () => { uapiReq.destroy(); res.status(504).json({ error: '查询服务超时' }) })
  uapiReq.on('error', (e) => { console.error('UAPI error:', e.message); res.status(502).json({ error: '代理请求失败' }) })
})

// DeepSeek proxy
router.post('/deepseek/v1/chat/completions', async (req, res) => {
  const dsKey = await resolveDsKey(req)
  const bodyStr = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null

  function makeRequest(bodyString) {
    const proxy = https.request('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(bodyString)), 'Authorization': dsKey },
      timeout: 15000
    }, (proxyRes) => { res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' }); proxyRes.pipe(res) })
    proxy.on('timeout', () => { proxy.destroy(); res.status(504).json({ error: 'AI 服务响应超时' }) })
    proxy.on('error', (e) => { console.error('DS error:', e.message); res.status(502).json({ error: 'AI 连接失败' }) })
    proxy.write(bodyString)
    proxy.end()
  }

  if (bodyStr) { makeRequest(bodyStr) }
  else {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => makeRequest(Buffer.concat(chunks).toString()))
  }
})

// Get quota
router.get('/api/quota', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  res.json({ free_queries_left: getFreeQuota(ip) })
})

export default router
