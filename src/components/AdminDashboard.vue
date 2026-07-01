<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>🛡️ 管理员面板</h3>
          <button class="close-btn" @click="close"><XMarkIcon class="close-icon" /></button>
        </div>

        <div class="drawer-body">
          <!-- Tabs -->
          <div class="tabs">
            <button :class="{ active: tab === 'config' }" @click="tab = 'config'">⚙️ 全局配置</button>
            <button :class="{ active: tab === 'users' }" @click="loadUsers">👥 用户列表</button>
            <button :class="{ active: tab === 'queries' }" @click="loadQueries">📋 查询记录</button>
          </div>

          <!-- Config Tab -->
          <div v-if="tab === 'config'" class="tab-panel">
            <div class="toggle-row">
              <div>
                <span class="toggle-label">启用全局 API Key</span>
                <p class="toggle-desc">开启后所有用户直接使用管理员配置的密钥</p>
              </div>
              <el-switch v-model="cfgEnabled" @change="autoSaveCfg" />
            </div>
            <div class="divider"></div>
            <div class="key-section">
              <div class="section-header"><span class="section-title">📦 快递查询 API</span></div>
              <el-input v-model="cfgUapi" type="password" show-password placeholder="全局 UAPI 密钥" size="default" clearable @change="autoSaveCfg" />
            </div>
            <div class="divider"></div>
            <div class="key-section">
              <div class="section-header"><span class="section-title">🤖 DeepSeek AI</span></div>
              <el-input v-model="cfgDs" type="password" show-password placeholder="全局 DeepSeek 密钥" size="default" clearable @change="autoSaveCfg" />
            </div>
          </div>

          <!-- Users Tab -->
          <div v-if="tab === 'users'" class="tab-panel">
            <div v-if="loadingUsers" class="loading">加载中...</div>
            <div v-else class="user-list">
              <div v-for="u in users" :key="u._id" class="user-row">
                <div class="user-info">
                  <span class="online-dot" :class="u.online ? 'online' : 'offline'" :title="u.online ? '在线' : '离线'"></span>
                  <span class="user-email">{{ u.email }}</span>
                  <span v-if="u.role === 'admin'" class="badge admin-badge">管理员</span>
                </div>
                <div class="user-meta">
                  <span class="user-time">注册: {{ fmtDate(u.createdAt) }}</span>
                  <span class="user-time">活跃: {{ fmtDate(u.lastActive) }}</span>
                </div>
              </div>
              <p v-if="users.length === 0" class="empty">暂无注册用户</p>
            </div>
          </div>

          <!-- Queries Tab -->
          <div v-if="tab === 'queries'" class="tab-panel">
            <div v-if="loadingQueries" class="loading">加载中...</div>
            <div v-else class="query-list">
              <div v-for="q in queries" :key="q._id" class="query-row">
                <div class="query-top">
                  <span class="query-num">{{ q.trackingNumber }}</span>
                  <span class="query-status" :class="q.success ? 'q-ok' : 'q-fail'">{{ q.success ? '✅' : '❌' }}</span>
                </div>
                <div class="query-meta">
                  <span>{{ q.email }}</span>
                  <span v-if="q.carrier"> · {{ q.carrier }}</span>
                  <span class="query-time">{{ fmtDate(q.createdAt) }}</span>
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
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean, token: String })
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => emit('update:modelValue', v))

const tab = ref('config')

// Config state
const cfgEnabled = ref(false)
const cfgUapi = ref('')
const cfgDs = ref('')
let saveTimer = null

// Users state
const users = ref([])
const loadingUsers = ref(false)

// Queries state
const queries = ref([])
const loadingQueries = ref(false)

// Heartbeat
let heartbeatTimer = null

function close() { visible.value = false }

watch(visible, async (v) => {
  if (!v) return
  tab.value = 'config'
  // Load config
  try {
    const res = await fetch('/api/admin/config/full', { headers: { Authorization: 'Bearer ' + props.token } })
    if (res.ok) {
      const d = await res.json()
      cfgEnabled.value = d.enabled; cfgUapi.value = d.uapiKey || ''; cfgDs.value = d.deepseekKey || ''
    }
  } catch {}
})

// Heartbeat every 60s while panel open
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
        body: JSON.stringify({ enabled: cfgEnabled.value, uapiKey: cfgUapi.value, deepseekKey: cfgDs.value })
      })
      emit('saved')
    } catch {}
  }, 500)
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    const res = await fetch('/api/admin/users', { headers: { Authorization: 'Bearer ' + props.token } })
    if (res.ok) users.value = await res.json()
  } catch {}
  loadingUsers.value = false
}

async function loadQueries() {
  loadingQueries.value = true
  try {
    const res = await fetch('/api/admin/queries', { headers: { Authorization: 'Bearer ' + props.token } })
    if (res.ok) queries.value = await res.json()
  } catch {}
  loadingQueries.value = false
}

function fmtDate(d) {
  if (!d) return '-'
  const t = new Date(d)
  return t.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
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

/* Tabs */
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

/* Users */
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
.user-meta { display: flex; gap: 12px; font-size: 11px; color: #bbb; }

/* Queries */
.query-list { display: flex; flex-direction: column; gap: 2px; }
.query-row { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.query-row:last-child { border-bottom: none; }
.query-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.query-num { font-family: monospace; font-size: 14px; color: #333; font-weight: 500; }
.query-status { font-size: 13px; }
.q-ok { color: #07c160; }
.q-fail { color: #f56c6c; }
.query-meta { font-size: 12px; color: #999; }
.query-time { margin-left: auto; color: #bbb; font-size: 11px; }

.empty { text-align: center; color: #bbb; padding: 20px; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
