import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import GlobalConfig from '../models/GlobalConfig.js'
import Setup from '../models/Setup.js'
import { signToken } from '../middleware/auth.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GET /api/setup/status
router.get('/status', async (req, res) => {
  try {
    const setup = await Setup.findById('setup')
    res.json({ initialized: !!(setup && setup.initialized) })
  } catch {
    // DB not connected yet — definitely not initialized
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

    // Validate required
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: '管理员邮箱和密码不能为空' })
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    // Check if already installed
    const existing = await Setup.findById('setup')
    if (existing && existing.initialized) {
      return res.status(400).json({ error: '已初始化，无需重复安装' })
    }

    // Switch MongoDB connection if user provided a different URI
    if (mongoUri && mongoUri !== process.env.MONGO_URI) {
      try {
        const mongoose = (await import('mongoose')).default
        await mongoose.disconnect()
        await mongoose.connect(mongoUri)
        console.log('✅ 切换到用户指定 MongoDB')
      } catch (e) {
        return res.status(400).json({ error: 'MongoDB 连接失败: ' + e.message })
      }
    }

    // Create admin user
    const existingUser = await User.findOne({ email: adminEmail })
    let adminUser
    if (existingUser) {
      existingUser.role = 'admin'
      existingUser.password = adminPassword
      adminUser = await existingUser.save()
    } else {
      adminUser = await User.create({ email: adminEmail, password: adminPassword, role: 'admin' })
    }

    // Create global config
    await GlobalConfig.findByIdAndUpdate(
      'global',
      {
        $set: {
          uapiKey: uapiKey || '',
          deepseekKey: deepseekKey || '',
          enabled: !!enableGlobal
        }
      },
      { upsert: true }
    )

    // Mark as initialized
    await Setup.findByIdAndUpdate(
      'setup',
      { $set: { initialized: true, installedAt: new Date() } },
      { upsert: true }
    )

    // Write .env file
    const envPath = path.resolve(__dirname, '..', '..', '.env')
    const envLines = []
    if (mongoUri) envLines.push(`MONGO_URI=${mongoUri}`)
    if (jwtSecret) envLines.push(`JWT_SECRET=${jwtSecret}`)
    envLines.push(`PORT=${process.env.PORT || 3014}`)
    try {
      fs.writeFileSync(envPath, envLines.join('\n') + '\n')
    } catch (e) {
      console.warn('无法写入 .env:', e.message)
    }

    // Generate admin token
    const token = signToken(adminUser._id)

    res.json({
      ok: true,
      token,
      email: adminUser.email,
      message: '安装完成！请重启服务以应用所有配置。'
    })
  } catch (e) {
    console.error('Setup error:', e.message)
    res.status(500).json({ error: '安装失败: ' + e.message })
  }
})

export default router
