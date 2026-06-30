import { ref, computed } from 'vue'

const TOKEN_KEY = 'auth_token'
const EMAIL_KEY = 'auth_email'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const email = ref(localStorage.getItem(EMAIL_KEY) || '')
const isAdmin = ref(false)

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value)

  function setAuth(t, e) {
    token.value = t
    email.value = e
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(EMAIL_KEY, e)
    checkAdmin()
  }

  function clearAuth() {
    token.value = ''
    email.value = ''
    isAdmin.value = false
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
  }

  async function checkAdmin() {
    if (!token.value) { isAdmin.value = false; return }
    try {
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: 'Bearer ' + token.value }
      })
      if (res.ok) {
        const data = await res.json()
        isAdmin.value = data.role === 'admin'
      } else {
        isAdmin.value = false
      }
    } catch { isAdmin.value = false }
  }

  async function register(em, pw) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: pw })
    })
    let data = {}
    try { data = await res.json() } catch {}
    if (!res.ok) throw new Error(data.error || '注册失败')
    if (data.token) setAuth(data.token, data.email)
    return data
  }

  async function login(em, pw) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: pw })
    })
    let data = {}
    try { data = await res.json() } catch {}
    if (!res.ok) throw new Error(data.error || '登录失败')
    setAuth(data.token, data.email)
    return data
  }

  function logout() { clearAuth() }

  return { token, email, isAdmin, isLoggedIn, register, login, logout, checkAdmin }
}
