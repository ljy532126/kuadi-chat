import { Router } from 'express'
import https from 'https'
import { verifyToken } from '../middleware/auth.js'
import { rateLimitMiddleware, consumeFreeQuery, getFreeQuota } from '../middleware/rateLimit.js'
import GlobalConfig from '../models/GlobalConfig.js'
import QueryLog from '../models/QueryLog.js'
import User from '../models/User.js'

const router = Router()
const RETRIES = 2

async function resolveUapiKey(req) {
  if (req.headers['x-use-global'] === '1') {
    const cfg = await GlobalConfig.findById('global').lean()
    if (!cfg || !cfg.enabled || !cfg.uapiKey) return null
    const userId = req._userId
    if (userId) {
      const user = await User.findById(userId).select('role useGlobal').catch(() => null)
      if (!user || (!user.useGlobal && user.role !== 'admin')) return null
    }
    return 'Bearer ' + (cfg.uapiKey.startsWith('uapi-') ? cfg.uapiKey : 'uapi-' + cfg.uapiKey)
  }
  if (req.headers['x-uapi-key']) return req.headers['x-uapi-key']
  const userId = req._userId
  if (userId) {
    const user = await User.findById(userId).select('role useGlobal').catch(() => null)
    if (user && (user.useGlobal || user.role === 'admin')) {
      const cfg = await GlobalConfig.findById('global').lean()
      if (cfg && cfg.enabled && cfg.uapiKey) {
        return 'Bearer ' + (cfg.uapiKey.startsWith('uapi-') ? cfg.uapiKey : 'uapi-' + cfg.uapiKey)
      }
    }
  }
  return ''
}

async function resolveDsKey(req) {
  if (req.headers['x-use-global'] === '1') {
    const cfg = await GlobalConfig.findById('global').lean()
    if (!cfg || !cfg.enabled || !cfg.deepseekKey) return null
    const userId = req._userId
    if (userId) {
      const user = await User.findById(userId).select('role useGlobal').catch(() => null)
      if (!user || (!user.useGlobal && user.role !== 'admin')) return null
    }
    return 'Bearer ' + cfg.deepseekKey
  }
  if (req.headers['x-ds-key']) return req.headers['x-ds-key']
  const userId = req._userId
  if (userId) {
    const user = await User.findById(userId).select('role useGlobal').catch(() => null)
    if (user && (user.useGlobal || user.role === 'admin')) {
      const cfg = await GlobalConfig.findById('global').lean()
      if (cfg && cfg.enabled && cfg.deepseekKey) return 'Bearer ' + cfg.deepseekKey
    }
  }
  return ''
}

async function resolveUserEmail(header) {
  if (!header || !header.startsWith('Bearer ')) return 'anonymous'
  try {
    const p = verifyToken(header.slice(7))
    const user = await User.findById(p.userId).select('email').catch(() => null)
    return user ? user.email : 'anonymous'
  } catch { return 'anonymous' }
}

// UAPI proxy with retry
router.get('/api/v1/misc/tracking/query', rateLimitMiddleware, async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const header = req.headers.authorization
  let isAuth = false; let logEmail = 'anonymous'; let logUserId = null; let isGuest = true
  if (header && header.startsWith('Bearer ')) {
    try { const p = verifyToken(header.slice(7)); req._userId = p.userId; isAuth = true; isGuest = false } catch {}
  }
  if (isAuth) {
    const user = await resolveUserEmail(header)
    logEmail = user; logUserId = req._userId
  }

  if (!isAuth) {
    const left = getFreeQuota(ip)
    if (left <= 0) {
      return res.status(429).json({
        message: '今日免费查询次数已用完（10次/天），请注册登录获取更多查询次数。'
      })
    }
    consumeFreeQuery(ip)
  }

  const targetUrl = 'https://uapis.cn/api/v1/misc/tracking/query?' + new URLSearchParams(req.query).toString()
  const uapiKey = await resolveUapiKey(req)
  const trackingNumber = req.query.tracking_number || ''
  let attempt = 0

  function doRequest() {
    attempt++
    if (res.writableEnded) return

    const uapiReq = https.get(targetUrl, {
      headers: { 'Authorization': uapiKey, 'Accept': 'application/json' },
      timeout: 6000
    }, async (proxyRes) => {
      let body = ''
      proxyRes.on('data', chunk => body += chunk)
      proxyRes.on('end', async () => {
        // Retry on 5xx
        if (proxyRes.statusCode >= 500 && attempt < RETRIES) {
          return setTimeout(doRequest, 500 * attempt)
        }

        const success = proxyRes.statusCode === 200
        try {
          const carrier = success ? (JSON.parse(body || '{}').carrier_name || '') : ''
          await QueryLog.create({ email: logEmail, trackingNumber, carrier, success, ip, userId: logUserId, isGuest })
        } catch {}

        if (res.writableEnded) return
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' })
        try {
          const data = JSON.parse(body || '{}')
          data.free_queries_left = getFreeQuota(ip)
          res.end(JSON.stringify(data))
        } catch {
          res.end(JSON.stringify({
            code: 'UPSTREAM_ERROR',
            message: body ? '快递查询服务响应异常' : '快递查询服务暂不可用，请稍后重试',
            free_queries_left: getFreeQuota(ip)
          }))
        }
      })
    })
    uapiReq.on('timeout', () => {
      uapiReq.destroy()
      if (attempt < RETRIES) return setTimeout(doRequest, 500 * attempt)
      if (!res.writableEnded) {
        res.status(504).json({
          code: 'UPSTREAM_TIMEOUT',
          message: '快递查询服务超时，请稍后重试',
          free_queries_left: getFreeQuota(ip)
        })
      }
    })
    uapiReq.on('error', (e) => {
      console.error('UAPI error:', e.message)
      if (attempt < RETRIES) return setTimeout(doRequest, 500 * attempt)
      if (!res.writableEnded) {
        res.status(502).json({
          code: 'UPSTREAM_ERROR',
          message: '快递查询服务异常，请稍后重试',
          free_queries_left: getFreeQuota(ip)
        })
      }
    })
  }

  doRequest()
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
    proxy.on('timeout', () => { proxy.destroy(); if (!res.writableEnded) res.status(504).json({ code: 'UPSTREAM_TIMEOUT', message: 'AI 服务响应超时' }) })
    proxy.on('error', (e) => { console.error('DS error:', e.message); if (!res.writableEnded) res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'AI 连接失败' }) })
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

router.get('/api/quota', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  res.json({ free_queries_left: getFreeQuota(ip) })
})

export default router
