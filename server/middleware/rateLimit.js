// Track anonymous queries by IP — 10/day limit
const ipQuota = new Map()

// Reset all quotas daily at midnight
function scheduleReset() {
  const now = new Date()
  const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
  setTimeout(() => {
    ipQuota.clear()
    scheduleReset()
  }, msToMidnight + 1000)
}
scheduleReset()

export function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const used = ipQuota.get(ip) || 0
  req.freeQueriesLeft = Math.max(0, 10 - used)
  req.freeQueriesUsed = used
  next()
}

export function consumeFreeQuery(ip) {
  ipQuota.set(ip, (ipQuota.get(ip) || 0) + 1)
}

export function getFreeQuota(ip) {
  return Math.max(0, 10 - (ipQuota.get(ip) || 0))
}
