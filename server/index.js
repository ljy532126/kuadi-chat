import 'dotenv/config'
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
  contentSecurityPolicy: false,  // allow inline scripts for SPA
  crossOriginEmbedderPolicy: false
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

// Serve Vite dist in production
const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath, { maxAge: '7d' }))
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/deepseek/')) return next()
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
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB 连接成功')
  } catch (e) {
    console.error('❌ MongoDB 连接失败:', e.message)
    console.log('请在 docker-compose.yml 目录运行: docker compose up -d')
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`🚀 快递查询服务已启动: http://localhost:${PORT}`)
  })
}

start()
