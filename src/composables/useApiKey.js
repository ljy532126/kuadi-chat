import { ref, reactive, computed } from 'vue'

const KEYS = { uapi: 'uapi_key', deepseek: 'deepseek_key' }

const globalEnabled = ref(false)
const globalHasUapi = ref(false)
const globalHasDeepseek = ref(false)

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
      }
    } catch {}
  }

  function saveUapi(raw) {
    let key = raw.trim()
    if (key.startsWith('uapi-')) key = key.slice(5)
    keys.uapi = key
    try { localStorage.setItem(KEYS.uapi, key) } catch {}
  }

  function saveDeepseek(raw) {
    const key = raw.trim()
    keys.deepseek = key
    try { localStorage.setItem(KEYS.deepseek, key) } catch {}
  }

  function clearUapi() { keys.uapi = ''; try { localStorage.removeItem(KEYS.uapi) } catch {} }
  function clearDeepseek() { keys.deepseek = ''; try { localStorage.removeItem(KEYS.deepseek) } catch {} }

  load()

  const hasUapi = computed(() => globalEnabled.value ? globalHasUapi.value : !!keys.uapi)
  const hasDeepseek = computed(() => globalEnabled.value ? globalHasDeepseek.value : !!keys.deepseek)
  const usingGlobal = computed(() => globalEnabled.value && (globalHasUapi.value || globalHasDeepseek.value))

  return {
    keys, globalEnabled, globalHasUapi, globalHasDeepseek,
    hasUapi, hasDeepseek, usingGlobal,
    saveUapi, saveDeepseek, clearUapi, clearDeepseek,
    fetchGlobalConfig, load
  }
}
