import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const SECRET = process.env.JWT_SECRET || 'tracking-jwt-secret-change-in-production'

export function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }
  try {
    const payload = verifyToken(header.slice(7))
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

export async function adminMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role')
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可操作' })
    }
    next()
  } catch {
    return res.status(500).json({ error: '权限验证失败' })
  }
}
