import { Router } from 'express'
import RateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { signToken, authMiddleware } from '../middleware/auth.js'

const router = Router()

const authLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请15分钟后再试。' }
})

const strictAuthLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请15分钟后再试。' },
  skipSuccessfulRequests: true
})

const EMAIL_MAX = 254
const PW_MIN = 6
const PW_MAX = 128

function sanitizeInput(val) {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed || trimmed.length > 1024) return null
  if (/^\$/.test(trimmed) || /\.\$/.test(trimmed)) return null
  return trimmed
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const ERR = '注册失败，请稍后重试'
  const DELAY = 500
  const start = Date.now()

  try {
    const email = sanitizeInput(req.body.email)
    const password = sanitizeInput(req.body.password)

    if (!email || !password || email.length > EMAIL_MAX) {
      await sleep(DELAY - (Date.now() - start))
      return res.status(400).json({ error: '邮箱或密码格式不正确' })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sleep(DELAY - (Date.now() - start))
      return res.status(400).json({ error: '邮箱或密码格式不正确' })
    }

    if (password.length < PW_MIN || password.length > PW_MAX) {
      await sleep(DELAY - (Date.now() - start))
      return res.status(400).json({ error: '邮箱或密码格式不正确' })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      await sleep(DELAY - (Date.now() - start))
      return res.json({ ok: true })
    }

    const user = await User.create({ email, password })
    const token = signToken(user._id)

    const elapsed = Date.now() - start
    if (elapsed < DELAY) await sleep(DELAY - elapsed)

    res.json({ token, email: user.email })
  } catch (e) {
    console.error('Register:', e.message)
    const elapsed = Date.now() - start
    if (elapsed < DELAY) await sleep(DELAY - elapsed)
    res.status(500).json({ error: ERR })
  }
})

// POST /api/auth/login
router.post('/login', strictAuthLimiter, async (req, res) => {
  const ERR = '邮箱或密码错误'
  const DELAY = 500
  const start = Date.now()

  try {
    const email = sanitizeInput(req.body.email)
    const password = sanitizeInput(req.body.password)

    if (!email || !password) {
      await sleep(DELAY - (Date.now() - start))
      return res.status(400).json({ error: ERR })
    }

    const user = await User.findOne({ email })

    // User found — real compare
    if (user) {
      const ok = await user.comparePassword(password || '')
      const elapsed = Date.now() - start
      if (elapsed < DELAY) await sleep(DELAY - elapsed)

      if (!ok) return res.status(401).json({ error: ERR })

      const token = signToken(user._id)
      return res.json({ token, email: user.email })
    }

    // User not found — dummy hash to normalize timing
    try {
      await bcrypt.hash('dummy', 10)
    } catch {}

    const elapsed = Date.now() - start
    if (elapsed < DELAY) await sleep(DELAY - elapsed)

    res.status(401).json({ error: ERR })
  } catch (e) {
    console.error('Login:', e.message)
    const elapsed = Date.now() - start
    if (elapsed < DELAY) await sleep(DELAY - elapsed)
    res.status(500).json({ error: ERR })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ error: '用户不存在' })
    res.json({ email: user.email, createdAt: user.createdAt })
  } catch (e) {
    console.error('Me:', e.message)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

export default router
