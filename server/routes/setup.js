import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { signToken } from '../middleware/auth.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// POST /api/setup/test-mongo
router.post('/test-mongo', async (req, res) => {
  try {
    const { mongoUri } = req.body
    if (!mongoUri) return res.status(400).json({ error: '缺少 MongoDB 连接地址' })
    const mongoose = (await import('mongoose')).default
    const testConn = await mongoose.createConnection(mongoUri, {
      serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000
    }).asPromise()
    await testConn.close()
    res.json({ ok: true, message: 'MongoDB 连接成功' })
  } catch (e) {
    res.status(400).json({ error: '连接失败: ' + e.message })
  }
})

// GET /api/setup/status
router.get('/status', async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default
    const db = mongoose.connection
    // If we can't even talk to DB, report not initialized
    if (db.readyState !== 1) return res.json({ initialized: false, dbError: true })
    const Setup = (await import('../models/Setup.js')).default
    const setup = await Setup.findById('setup')
    res.json({ initialized: !!(setup && setup.initialized) })
  } catch {
    res.json({ initialized: false, dbError: true })
  }
})

// POST /api/setup
router.post('/', async (req, res) => {
  try {
    const {
      adminEmail, adminPassword,
      mongoUri,
      jwtSecret,
      uapiKey, deepseekKey, enableGlobal
    } = req.body

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: '管理员邮箱和密码不能为空' })
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    // 1. Connect to the target MongoDB FIRST
    const mongoose = (await import('mongoose')).default
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
    } catch (e) {
      return res.status(400).json({ error: 'MongoDB 连接失败: ' + e.message })
    }

    // 2. Now load models (they'll use the new connection)
    const User = (await import('../models/User.js')).default
    const GlobalConfig = (await import('../models/GlobalConfig.js')).default
    const Setup = (await import('../models/Setup.js')).default

    // 3. Check if already installed
    const existing = await Setup.findById('setup')
    if (existing && existing.initialized) {
      return res.status(400).json({ error: '已初始化，无需重复安装' })
    }

    // 4. Create admin
    const existingUser = await User.findOne({ email: adminEmail })
    let adminUser
    if (existingUser) {
      existingUser.role = 'admin'
      existingUser.password = adminPassword
      adminUser = await existingUser.save()
    } else {
      adminUser = await User.create({ email: adminEmail, password: adminPassword, role: 'admin' })
    }

    // 5. Global config
    await GlobalConfig.findByIdAndUpdate(
      'global',
      { $set: { uapiKey: uapiKey || '', deepseekKey: deepseekKey || '', enabled: !!enableGlobal } },
      { upsert: true }
    )

    // 6. Mark initialized
    await Setup.findByIdAndUpdate(
      'setup',
      { $set: { initialized: true, installedAt: new Date() } },
      { upsert: true }
    )

    // 7. Write .env
    const envPath = path.resolve(__dirname, '..', '..', '.env')
    const envLines = []
    if (mongoUri) envLines.push(`MONGO_URI=${mongoUri}`)
    if (jwtSecret) envLines.push(`JWT_SECRET=${jwtSecret}`)
    envLines.push(`PORT=${process.env.PORT || 3014}`)
    try { fs.writeFileSync(envPath, envLines.join('\n') + '\n') } catch {}

    const token = signToken(adminUser._id)
    res.json({ ok: true, token, email: adminUser.email, message: '安装完成！请重启服务以应用所有配置。' })
  } catch (e) {
    console.error('Setup error:', e.message)
    res.status(500).json({ error: '安装失败: ' + e.message })
  }
})

export default router
