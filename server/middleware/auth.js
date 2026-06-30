import jwt from 'jsonwebtoken'

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
