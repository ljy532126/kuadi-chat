import { ref, reactive, computed } from 'vue'

const KEYS = { uapi: 'uapi_key', deepseek: 'deepseek_key' }

const globalEnabled = ref(false)
const globalHasUapi = ref(false)
const globalHasDeepseek = ref(false)
const userUseGlobal = ref(false)
const adminContact = ref('')

export function useApiKey() {
  const keys = reactive({ uapi: '', deepseek: '' })

  function load() {
    try {
      keys.uapi = localStorage.getItem(KEYS.uapi) || ''
      keys.deepseek = localStorage.getItem(KEYS.deepseek) || ''
    } catch {
      keys.uapi = ''
      keys.deepseek = ''
    }
  }

  async function fetchGlobalConfig() {
    try {
      const res = await fetch('/api/admin/config')
      if (res.ok) {
        const data = await res.json()
        globalEnabled.value = data.enabled
        globalHasUapi.value = data.hasUapi
        globalHasDeepseek.value = data.hasDeepseek
        adminContact.value = data.adminContact || ''
      }
    } catch {}
  }

  async function fetchUserGlobal(authToken) {
    if (!authToken) { userUseGlobal.value = false; return }
    try {
      const res = await fetch('/api/admin/me', { headers: { Authorization: 'Bearer ' + authToken } })
      if (res.ok) {
        const data = await res.json()
        userUseGlobal.value = !!data.useGlobal
      }
    } catch { userUseGlobal.value = false }
  }

  function saveUapi(raw) {
    keys.uapi = raw.trim()
    try { localStorage.setItem(KEYS.uapi, keys.uapi) } catch {}
  }

  function saveDeepseek(raw) {
    keys.deepseek = raw.trim()
    try { localStorage.setItem(KEYS.deepseek, keys.deepseek) } catch {}
  }

  function clearUapi() { keys.uapi = ''; try { localStorage.removeItem(KEYS.uapi) } catch {} }
  function clearDeepseek() { keys.deepseek = ''; try { localStorage.removeItem(KEYS.deepseek) } catch {} }

  load()

  const hasUapi = computed(() => {
    if (globalEnabled.value && userUseGlobal.value) return globalHasUapi.value
    return !!keys.uapi
  })
  const hasDeepseek = computed(() => {
    if (globalEnabled.value && userUseGlobal.value) return globalHasDeepseek.value
    return !!keys.deepseek
  })
  const usingGlobal = computed(() => globalEnabled.value && userUseGlobal.value && (globalHasUapi.value || globalHasDeepseek.value))

  return {
    keys, globalEnabled, globalHasUapi, globalHasDeepseek, userUseGlobal, adminContact,
    hasUapi, hasDeepseek, usingGlobal,
    saveUapi, saveDeepseek, clearUapi, clearDeepseek,
    fetchGlobalConfig, fetchUserGlobal, load
  }
}
