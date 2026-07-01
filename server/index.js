import 'dotenv/config'

// ---- Bypass system proxy for uapis.cn ----
// Node.js by default routes HTTPS through HTTP_PROXY (e.g. Clash on 127.0.0.1:7890)
// which can block or slow UAPI queries. Force direct connection.
process.env.HTTP_PROXY = ''
process.env.HTTPS_PROXY = ''
process.env.http_proxy = ''
process.env.https_proxy = ''
process.env.NO_PROXY = '*'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import statsRoutes from './routes/stats.js'
import adminRoutes from './routes/admin.js'
import setupRoutes from './routes/setup.js'
import proxyRoutes from './routes/proxy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3014
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracking'

const app = express()

// ---- Security middleware ----
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,  // dev: any; prod: set specific domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Ds-Key', 'X-Uapi-Key']
}))

// Body parsing with size limits
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: false, limit: '16kb' }))

// Trust proxy for rate limiting (if behind nginx/load balancer)
app.set('trust proxy', 1)

// Global rate limit — 200 req/min
import RateLimit from 'express-rate-limit'
const globalLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁' }
})
app.use(globalLimiter)

// Auth routes
app.use('/api/auth', authRoutes)

// Stats routes
app.use('/api/stats', statsRoutes)

// Admin routes
app.use('/api/admin', adminRoutes)

// Setup wizard
app.use('/api/setup', setupRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mongodb: mongoose.connection.readyState === 1 })
})

// Proxy routes (UAPI + DeepSeek + quota check)
app.use('/', proxyRoutes)

// ---- Anti-cache middleware for all API responses ----
// Cloudflare respects Cache-Control headers by default. Setting no-store
// tells Cloudflare to bypass its edge cache entirely for these responses.
app.use((req, res, next) => {
  // API routes must never be cached — they return dynamic data
  if (req.url.startsWith('/api/') || req.url.startsWith('/deepseek/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    // Cloudflare-specific: force bypass
    res.setHeader('CDN-Cache-Control', 'no-store')
  }
  next()
})

// ---- Static files with per-type cache policy ----
// Vite generates content-hashed filenames (e.g. index-H9HibSo_.js).
// Hashed assets can be cached long-term — a code change produces a new hash.
// HTML must never be cached — it's the SPA shell that links to hashed assets.
const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath, {
  setHeaders(res, filePath) {
    // No-CDN-cache is the top priority
    res.setHeader('CDN-Cache-Control', 'no-store')

    if (filePath.endsWith('.html')) {
      // SPA entry point: aggressive no-cache — forces Cloudflare + browser
      // to fetch fresh HTML on every request
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    } else if (/\.(js|css|woff2?|png|svg|ico)$/.test(filePath)) {
      // Hashed assets: cached 1 year — a code change produces new hash,
      // so stale cache is never served
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } else {
      // Other static files: short cache
      res.setHeader('Cache-Control', 'public, max-age=3600')
    }
  }
}))

// SPA fallback — only for page routes, NOT for asset files
// Asset requests (css/js/png/svg/ico/woff2) that 404 should fail cleanly,
// not get served index.html (which causes "MIME type text/html" errors)
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/deepseek/')) return next()

  // If it looks like a static asset, let Express 404 it properly
  if (/\.(css|js|png|svg|ico|woff2?|ttf|eot|jpg|webp|gif|json|map|txt)(\?|$)/.test(req.url)) {
    return res.status(404).end()
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.sendFile(path.join(distPath, 'index.html'), err => {
    if (err) res.status(404).json({ error: 'Not found' })
  })
})

// Global error handler — never leak stack traces
app.use((err, req, res, _next) => {
  console.error('Error:', err.name, err.message)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大' })
  }
  res.status(500).json({ error: '服务器内部错误' })
})

async function start() {
  // Try to connect, but don't crash if it fails — setup wizard needs the server running
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    console.log('✅ MongoDB 连接成功')
  } catch (e) {
    console.warn('⚠️ MongoDB 连接失败 (' + e.message + ')，将在安装向导中配置')
    console.warn('   服务继续运行，打开浏览器进入安装向导')
  }

  app.listen(PORT, () => {
    console.log(`🚀 快递查询服务已启动: http://localhost:${PORT}`)
  })
}

start()
