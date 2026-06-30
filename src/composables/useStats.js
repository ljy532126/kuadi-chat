import { ref, computed, onMounted } from 'vue'

export function useStats() {
  const raw = ref({})

  onMounted(() => {
    fetchStats()
    trackVisit()
  })

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) raw.value = await res.json()
    } catch {}
  }

  async function trackVisit() {
    try { fetch('/api/stats/visit', { method: 'POST' }) } catch {}
  }

  async function trackQuery(status, carrier = '') {
    try {
      fetch('/api/stats/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: status === 'success', carrier })
      })
    } catch {}
    // Also update local cache
    const q = raw.value
    q.totalQueries = (q.totalQueries || 0) + 1
    q.todayQueries = (q.todayQueries || 0) + 1
    if (status === 'success') q.successQueries = (q.successQueries || 0) + 1
    else q.failedQueries = (q.failedQueries || 0) + 1
  }

  const stats = computed(() => ({
    totalVisits: raw.value.totalVisits || 0,
    todayVisits: raw.value.todayVisits || 0,
    totalQueries: raw.value.totalQueries || 0,
    todayQueries: raw.value.todayQueries || 0,
    successQueries: raw.value.successQueries || 0,
    failedQueries: raw.value.failedQueries || 0,
    byCarrier: raw.value.byCarrier || {}
  }))

  async function clearStats() {
    try {
      await fetch('/api/stats', { method: 'DELETE' })
      raw.value = {}
    } catch {}
  }

  return { stats, trackQuery, clearStats }
}
