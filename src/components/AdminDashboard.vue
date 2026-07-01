<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>管理员面板</h3>
          <button class="close-btn" @click="close"><XMarkIcon class="close-icon" /></button>
        </div>

        <div class="drawer-body">
          <div class="tabs">
            <button :class="{ active: tab === 'config' }" @click="switchTab('config')">全局配置</button>
            <button :class="{ active: tab === 'users' }" @click="switchTab('users')">用户列表</button>
            <button :class="{ active: tab === 'queries' }" @click="switchTab('queries')">查询记录</button>
          </div>

          <!-- Config Tab -->
          <div v-if="tab === 'config'" class="tab-panel">
            <div class="toggle-row">
              <div>
                <span class="toggle-label">启用全局 API Key</span>
                <p class="toggle-desc">开启后管理员可为指定用户开通全局使用权限</p>
              </div>
              <el-switch v-model="cfgEnabled" @change="autoSaveCfg" />
            </div>
            <div class="divider"></div>

            <div class="key-section">
              <div class="section-header"><span class="section-title">快递查询 API</span></div>
              <el-input v-model="cfgUapi" type="password" show-password placeholder="全局 UAPI 密钥" size="default" clearable autocomplete="off" @change="autoSaveCfg" />
              <div class="test-row">
                <el-button size="small" :loading="testingUapi" @click="testUapi" :disabled="!cfgUapi">测试连接</el-button>
                <span v-if="testUapiResult" :class="testUapiResult.ok ? 'test-ok' : 'test-fail'">{{ testUapiResult.msg }}</span>
              </div>
            </div>
            <div class="divider"></div>

            <div class="key-section">
              <div class="section-header"><span class="section-title">DeepSeek AI</span></div>
              <el-input v-model="cfgDs" type="password" show-password placeholder="全局 DeepSeek 密钥" size="default" clearable autocomplete="off" @change="autoSaveCfg" />
              <div class="test-row">
                <el-button size="small" :loading="testingDs" @click="testDs" :disabled="!cfgDs">测试连接</el-button>
                <span v-if="testDsResult" :class="testDsResult.ok ? 'test-ok' : 'test-fail'">{{ testDsResult.msg }}</span>
              </div>
            </div>
            <div class="divider"></div>

            <div class="key-section">
              <div class="section-header"><span class="section-title">管理员联系方式</span></div>
              <el-input v-model="cfgContact" placeholder="微信/QQ/邮箱，用户求助时显示" size="default" clearable @change="autoSaveCfg" />
              <span class="hint">用户无法使用全局密钥时会看到此联系方式</span>
            </div>
          </div>

          <!-- Users Tab -->
          <div v-if="tab === 'users'" class="tab-panel">
            <div class="search-bar">
              <el-input v-model="userSearch" placeholder="搜索邮箱..." size="default" clearable @input="onUserSearch" class="search-input">
                <template #prefix>
                  <MagnifyingGlassIcon class="search-icon" />
                </template>
              </el-input>
            </div>
            <div v-if="loadingUsers" class="loading">加载中...</div>
            <div v-else class="user-list">
              <div v-for="u in users" :key="u._id" class="user-row">
                <div class="user-info">
                  <span class="online-dot" :class="u.online ? 'online' : 'offline'" :title="u.online ? '在线' : '离线'"></span>
                  <span class="user-email">{{ u.email }}</span>
                  <span v-if="u.role === 'admin'" class="badge admin-badge">管理员</span>
                </div>
                <div class="user-meta">
                  <span>注册: {{ fmtDate(u.createdAt) }}</span>
                  <span>活跃: {{ fmtDate(u.lastActive) }}</span>
                </div>
                <div class="user-row-actions">
                  <span class="global-label">使用全局</span>
                  <el-switch v-model="u.useGlobal" size="small" @change="toggleUserGlobal(u)" />
                </div>
              </div>
              <p v-if="users.length === 0" class="empty">暂无注册用户</p>
            </div>
          </div>

          <!-- Queries Tab -->
          <div v-if="tab === 'queries'" class="tab-panel">
            <div class="query-header">
              <span class="query-count" v-if="queries.length">共 {{ queries.length }} 条记录</span>
              <el-button size="small" @click="exportQueries" :disabled="queries.length === 0">导出 CSV</el-button>
            </div>
            <div v-if="loadingQueries" class="loading">加载中...</div>
            <div v-else class="query-list">
              <div v-for="q in queries" :key="q._id" class="query-row">
                <div class="query-top">
                  <span class="query-num">{{ q.trackingNumber }}</span>
                  <span class="query-status" :class="q.success ? 'q-ok' : 'q-fail'">{{ q.success ? '成功' : '失败' }}</span>
                  <span v-if="q.isGuest" class="badge guest-badge">游客</span>
                  <span v-else class="badge login-badge">登录</span>
                </div>
                <div class="query-meta">
                  <span>{{ q.email }}</span>
                  <span v-if="q.carrier"> / {{ q.carrier }}</span>
                  <span class="query-time">{{ fmtFull(q.createdAt) }}</span>
                </div>
              </div>
              <p v-if="queries.length === 0" class="empty">暂无查询记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean, token: String })
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => emit('update:modelValue', v))

const tab = ref('config')

const cfgEnabled = ref(false); const cfgUapi = ref(''); const cfgDs = ref(''); const cfgContact = ref('')
const testingUapi = ref(false); const testUapiResult = ref(null)
const testingDs = ref(false); const testDsResult = ref(null)
const configLoaded = ref(false)
let saveTimer = null

const users = ref([]); const loadingUsers = ref(false); const userSearch = ref('')
const queries = ref([]); const loadingQueries = ref(false)
let heartbeatTimer = null; let searchTimer = null

function close() { visible.value = false }

function switchTab(t) {
  tab.value = t
  if (t === 'users' && users.value.length === 0) loadUsers()
  if (t === 'queries' && queries.value.length === 0) loadQueries()
}

watch(visible, async (v) => {
  if (!v) return
  tab.value = 'config'
  if (!configLoaded.value) {
    try {
      const res = await fetch('/api/admin/config/full', { headers: { Authorization: 'Bearer ' + props.token } })
      if (res.ok) {
        const d = await res.json()
        cfgEnabled.value = d.enabled; cfgUapi.value = d.uapiKey || ''
        cfgDs.value = d.deepseekKey || ''; cfgContact.value = d.adminContact || ''
        configLoaded.value = true
      }
    } catch {}
  }
})

function startHeartbeat() {
  heartbeatTimer = setInterval(async () => {
    try { await fetch('/api/admin/heartbeat', { method: 'POST', headers: { Authorization: 'Bearer ' + props.token } }) } catch {}
  }, 60000)
}
onMounted(startHeartbeat)
onUnmounted(() => clearInterval(heartbeatTimer))

async function autoSaveCfg() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + props.token },
        body: JSON.stringify({ enabled: cfgEnabled.value, uapiKey: cfgUapi.value, deepseekKey: cfgDs.value, adminContact: cfgContact.value })
      })
      emit('saved')
    } catch {}
  }, 500)
}

async function testUapi() {
  testingUapi.value = true; testUapiResult.value = null
  try {
    const resp = await fetch('/api/admin/test-uapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + props.token },
      body: JSON.stringify({ key: cfgUapi.value })
    })
    const data = await resp.json()
    testUapiResult.value = { ok: data.ok, msg: data.msg || (data.ok ? '连接成功' : '失败') }
  } catch { testUapiResult.value = { ok: false, msg: '网络错误' } }
  testingUapi.value = false
}

async function testDs() {
  testingDs.value = true; testDsResult.value = null
  try {
    const resp = await fetch('/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ds-Key': 'Bearer ' + cfgDs.value,
        'Authorization': 'Bearer ' + props.token
      },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
    })
    testDsResult.value = resp.ok ? { ok: true, msg: '连接成功' } : resp.status === 401 ? { ok: false, msg: '密钥无效' } : resp.status === 402 ? { ok: false, msg: '余额不足' } : { ok: false, msg: '状态 ' + resp.status }
  } catch { testDsResult.value = { ok: false, msg: '网络错误' } }
  testingDs.value = false
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    const q = userSearch.value ? '?search=' + encodeURIComponent(userSearch.value) : ''
    const res = await fetch('/api/admin/users' + q, { headers: { Authorization: 'Bearer ' + props.token } })
    if (res.ok) users.value = await res.json()
  } catch {}
  loadingUsers.value = false
}

function onUserSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadUsers, 300)
}

async function toggleUserGlobal(u) {
  try {
    await fetch('/api/admin/users/' + u._id + '/global', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + props.token },
      body: JSON.stringify({ useGlobal: u.useGlobal })
    })
  } catch { u.useGlobal = !u.useGlobal } // revert on error
}

async function loadQueries() {
  loadingQueries.value = true
  try {
    const res = await fetch('/api/admin/queries?limit=100', { headers: { Authorization: 'Bearer ' + props.token } })
    if (res.ok) queries.value = await res.json()
  } catch {}
  loadingQueries.value = false
}

function fmtDate(d) {
  if (!d) return '-'
  const t = new Date(d)
  return t.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtFull(d) {
  if (!d) return '-'
  const t = new Date(d)
  return t.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function exportQueries() {
  const a = document.createElement('a')
  a.href = '/api/admin/queries/export'
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; }
.drawer-panel { position: absolute; top: 0; right: 0; bottom: 0; width: 420px; max-width: 92vw; background: #fff; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.1); }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f0; }
.drawer-header h3 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.close-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; }
.close-btn:hover { background: #f5f5f5; }
.close-icon { width: 20px; height: 20px; color: #999; }
.drawer-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

.tabs { display: flex; border-bottom: 2px solid #f0f0f0; flex-shrink: 0; padding: 0 16px; }
.tabs button {
  background: none; border: none; padding: 12px 16px; font-size: 13px; font-weight: 500;
  color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all 0.15s;
}
.tabs button:hover { color: #333; }
.tabs button.active { color: #07c160; border-bottom-color: #07c160; }

.tab-panel { padding: 20px 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

.toggle-row { display: flex; align-items: center; justify-content: space-between; }
.toggle-label { font-weight: 600; font-size: 15px; }
.toggle-desc { font-size: 12px; color: #999; margin-top: 2px; }
.key-section { display: flex; flex-direction: column; gap: 6px; }
.section-header { display: flex; align-items: center; gap: 8px; }
.section-title { font-weight: 600; font-size: 15px; }
.divider { height: 1px; background: #f0f0f0; }
.loading { text-align: center; color: #999; padding: 20px; }
.hint { font-size: 10px; color: #bbb; margin-top: 2px; }

.test-row { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.test-ok { color: #07c160; font-size: 12px; }
.test-fail { color: #e6a23c; font-size: 12px; }

.search-bar { margin-bottom: 4px; }
.search-icon { width: 16px; height: 16px; color: #bbb; }

.user-list { display: flex; flex-direction: column; gap: 2px; }
.user-row { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.user-row:last-child { border-bottom: none; }
.user-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.online-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.online-dot.online { background: #07c160; }
.online-dot.offline { background: #ddd; }
.user-email { font-size: 14px; color: #333; font-weight: 500; }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 600; }
.admin-badge { background: #e8f5e9; color: #07c160; }
.guest-badge { background: #fff3e0; color: #e65100; }
.login-badge { background: #e3f2fd; color: #1565c0; }
.user-meta { display: flex; gap: 12px; font-size: 11px; color: #bbb; margin-top: 2px; }
.user-row-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.global-label { font-size: 12px; color: #999; }

.query-list { display: flex; flex-direction: column; gap: 2px; }
.query-row { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.query-row:last-child { border-bottom: none; }
.query-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.query-num { font-family: monospace; font-size: 14px; color: #333; font-weight: 500; }
.query-status { font-size: 13px; font-weight: 600; flex-shrink: 0; }
.query-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.query-count { font-size: 12px; color: #999; }
.q-ok { color: #07c160; }
.q-fail { color: #f56c6c; }
.query-meta { font-size: 12px; color: #999; display: flex; align-items: center; gap: 4px; }
.query-time { margin-left: auto; color: #bbb; font-size: 11px; }

.empty { text-align: center; color: #bbb; padding: 20px; font-size: 14px; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
