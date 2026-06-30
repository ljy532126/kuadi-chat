import { ref, reactive, computed } from 'vue'

const KEYS = { uapi: 'uapi_key', deepseek: 'deepseek_key' }

export function useApiKey() {
  const keys = reactive({
    uapi: '',
    deepseek: ''
  })

  function load() {
    try {
      keys.uapi = localStorage.getItem(KEYS.uapi) || ''
      keys.deepseek = localStorage.getItem(KEYS.deepseek) || ''
    } catch {
      keys.uapi = ''
      keys.deepseek = ''
    }
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

  function clearUapi() {
    keys.uapi = ''
    try { localStorage.removeItem(KEYS.uapi) } catch {}
  }

  function clearDeepseek() {
    keys.deepseek = ''
    try { localStorage.removeItem(KEYS.deepseek) } catch {}
  }

  load()

  const hasUapi = computed(() => !!keys.uapi)
  const hasDeepseek = computed(() => !!keys.deepseek)
  const canQuery = computed(() => !!keys.uapi)

  return {
    keys,
    hasUapi,
    hasDeepseek,
    canQuery,
    saveUapi,
    saveDeepseek,
    clearUapi,
    clearDeepseek,
    load
  }
}
