<template>
  <div v-if="!setupChecked" class="loading-screen">
    <div class="loading-spinner"></div>
  </div>
  <SetupWizard v-else-if="needsSetup" @done="window.location.reload()" />
  <div v-else class="app">
    <HeaderBar
      :avatarUrl="userAvatar"
      :isLoggedIn="isLoggedIn"
      :isAdmin="isAdmin"
      :userEmail="email"
      @toggle-settings="showSettings = !showSettings"
      @toggle-announce="showAnnounce = !showAnnounce"
      @toggle-avatar="showAvatarDialog = !showAvatarDialog"
      @toggle-stats="showStats = !showStats"
      @toggle-auth="showAuth = !showAuth"
      @toggle-admin="showAdmin = !showAdmin"
      @logout="handleLogout"
    />

    <SettingsPanel
      :uapiKey="keys.uapi"
      :deepseekKey="keys.deepseek"
      :visible="showSettings"
      :usingGlobal="usingGlobal"
      :globalEnabledView="globalEnabled"
      :adminContactView="adminContact"
      @save-uapi="handleSaveUapi"
      @save-deepseek="handleSaveDeepseek"
      @clear-all="handleClearAll"
      @update:visible="showSettings = $event"
    />

    <AdminDashboard v-if="isAdmin" v-model="showAdmin" :token="token" @saved="onAdminSaved" />

    <AuthDialog v-model="showAuth" />

    <AvatarDialog
      v-model="showAvatarDialog"
      :currentAvatar="userAvatar"
      @save="handleSaveAvatar"
      @clear="handleClearAvatar"
    />

    <AnnouncementDialog v-model="showAnnounce" />

    <StatsDialog v-model="showStats" :stats="stats" @clear="clearStats" />

    <ChatArea
      ref="chatAreaRef"
      :messages="messages"
      :userAvatar="userAvatar"
      @copy-text="handleCopyText"
      @export-image="handleExportImage"
      @copy-image="handleCopyImage"
      @toast="showToast"
    />

    <InputBar
      :disabled="isQuerying"
      :quotaLeft="freeQueriesLeft"
      :isLoggedIn="isLoggedIn"
      @send="handleSend"
    />

    <ToastMessage :message="toastMsg" :visible="!!toastMsg" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import HeaderBar from './components/HeaderBar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ChatArea from './components/ChatArea.vue'
import InputBar from './components/InputBar.vue'
import ToastMessage from './components/ToastMessage.vue'
import AnnouncementDialog from './components/AnnouncementDialog.vue'
import AvatarDialog from './components/AvatarDialog.vue'
import StatsDialog from './components/StatsDialog.vue'
import AuthDialog from './components/AuthDialog.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import SetupWizard from './components/SetupWizard.vue'
import { useApiKey } from './composables/useApiKey.js'
import { useAuth } from './composables/useAuth.js'
import { useAvatar } from './composables/useAvatar.js'
import { useStats } from './composables/useStats.js'
import { queryTracking } from './composables/useTracking.js'
import { chatWithDeepSeek } from './composables/useDeepSeek.js'
import { copyText, captureTrackingResult } from './composables/useClipboard.js'
import { parseInput } from './utils/parseInput.js'
import { sanitizeText } from './utils/sanitize.js'

const { keys, globalEnabled, globalHasUapi, globalHasDeepseek, userUseGlobal, adminContact, hasUapi, hasDeepseek, usingGlobal, saveUapi, saveDeepseek, clearUapi, clearDeepseek, fetchGlobalConfig, fetchUserGlobal } = useApiKey()
const { token, email, isAdmin, isLoggedIn, logout, checkAdmin } = useAuth()
const { avatar: userAvatar, saveAvatar, clearAvatar } = useAvatar()
const { stats, trackQuery, clearStats: resetStats } = useStats()

const showSettings = ref(false) // never auto-open; only on explicit click
const showAnnounce = ref(false)
const showAvatarDialog = ref(false)
const showStats = ref(false)
const showAuth = ref(false)
const showAdmin = ref(false)
const needsSetup = ref(false)
const setupChecked = ref(false)
const messages = reactive([])
const isQuerying = ref(false)
const toastMsg = ref('')
const chatAreaRef = ref(null)
const freeQueriesLeft = ref(10)

let msgId = 0
const chatHistory = []

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 1800)
}

function buildTrackingText(data) {
  const lines = []
  lines.push(data.carrier_name + ' - ' + data.tracking_number)
  lines.push('状态: ' + data.status)
  if (data.tracks?.length) {
    lines.push('')
    data.tracks.forEach(t => lines.push(t.time + '  ' + t.context))
  }
  if (data.is_completed && data.completed_at) {
    lines.push('')
    lines.push('已于 ' + data.completed_at + ' 签收')
  }
  return lines.join('\n')
}

function getErrorMessage(status, msg, code) {
  if (status === 429 && code === 'free_quota_exhausted') {
    return '今日免费查询次数已用完（10次/天）。<br><br>请 <button class="link-btn" onclick="document.querySelector(\'.login-btn\').click()">注册/登录</button> 获取无限查询次数。'
  }
  switch (status) {
    case 400: return '查询参数有误，请检查快递单号格式是否正确。'
    case 401: case 403: return 'UAPI 密钥无效，请在设置中更新。'
    case 404: return '未查询到物流信息。可能需要提供收件人手机号后4位。'
    case 429: return msg || '请求过于频繁，请稍后重试。'
    case 0: return '网络请求失败，请检查网络连接。'
    default: return msg ? sanitizeText(msg) : '请求失败（' + status + '），请稍后重试。'
  }
}

function handleSaveUapi(key) { saveUapi(key) }
function handleSaveDeepseek(key) { saveDeepseek(key) }
function handleClearAll() { clearUapi(); clearDeepseek() }

function handleLogout() {
  logout()
  window.location.reload()
}

function handleSaveAvatar(file) {
  saveAvatar(file).then(() => {
    showAvatarDialog.value = false
    showToast('头像已更新')
  }).catch(e => showToast(e.message))
}

function handleClearAvatar() {
  clearAvatar()
  showAvatarDialog.value = false
  showToast('头像已移除')
}

function clearStats() { resetStats() }

function onAdminSaved() {
  fetchGlobalConfig()
  showToast('全局配置已更新')
}

const HELP_TEXT = `<b>📦 快递查询助手使用指南</b><br><br>
<b>直接查：</b>输入快递单号即可自动识别快递公司<br>
<span style="color:#999;">例：JT0001234567890</span><br><br>
<b>指定快递：</b>单号 + 承运商代码<br>
<span style="color:#999;">例：JT0001234567890 yuantong</span><br><br>
<b>手机验证：</b>单号 + 手机后4位（顺丰等需要）<br>
<span style="color:#999;">例：SF0001234567890 0000</span><br><br>
<span style="font-size:12px;color:#999;">📌 未登录每天可免费查询10次，注册登录后不限次数</span>`

const INVALID_TEXT = '输入的内容似乎不是有效的快递单号。<br><br>快递单号通常是 <b>10-20位的字母数字组合</b>（如 JT0001234567890）。<br><br>输入 <b>"帮助"</b> 查看使用说明。'

async function handleSend(text) {
  if (!isQuerying.value) isQuerying.value = true
  else return

  messages.push({ id: ++msgId, role: 'user', type: 'text', text: sanitizeText(text) })

  if (!hasUapi.value) {
    await fetchGlobalConfig()
    if (!hasUapi.value) {
      // Global is enabled on system level but user's useGlobal is off
      let msg = ''
      if (globalEnabled.value && !userUseGlobal.value) {
        msg = '管理员开启了全局 API，但你的账号尚未开通全局使用权限。'
        if (adminContact.value) {
          msg += '<br><br>请联系管理员开通：<b>' + adminContact.value.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</b>'
        }
        msg += '<br><br>或者自行配置 API 密钥：点击右上角设置图标。'
      } else if (globalEnabled.value && !globalHasUapi.value) {
        msg = '全局 API 服务暂不可用，请联系管理员检查配置。'
      } else {
        msg = '请先设置 API 密钥才能查询。点击右上角设置图标进入配置页面。'
      }
      messages.push({ id: ++msgId, role: 'system', type: 'warn', text: msg })
      isQuerying.value = false
      return
    }
  }

  const parsed = parseInput(text)

  // DeepSeek mode
  if (hasDeepseek.value) {
    const thinkingIdx = messages.length
    messages.push({ id: ++msgId, role: 'system', type: 'thinking' })

    const dsResult = await chatWithDeepSeek(keys.deepseek, text, chatHistory, usingGlobal.value)

    const thinkMsg = messages[thinkingIdx]
    if (dsResult.error) {
      thinkMsg.type = 'error'
      thinkMsg.text = '🤖 AI 回复失败：' + dsResult.message
    } else {
      thinkMsg.type = 'text'
      thinkMsg.text = sanitizeText(dsResult.content)
      thinkMsg.copyText = dsResult.content
      chatHistory.push({ role: 'user', content: text })
      chatHistory.push({ role: 'assistant', content: dsResult.content })
      if (chatHistory.length > 12) chatHistory.splice(0, 2)
    }

    if (parsed && parsed.type === 'query') {
      const trackIdx = messages.length
      messages.push({ id: ++msgId, role: 'system', type: 'thinking' })

      const result = await queryTracking(keys.uapi, parsed, token.value, usingGlobal.value)
      const trackMsg = messages[trackIdx]

      if (result.error) {
        trackMsg.type = result.status === 404 ? 'warn' : 'error'
        trackMsg.text = getErrorMessage(result.status, result.message, result.code)
        trackQuery('failed')
      } else {
        trackMsg.type = 'tracking'
        trackMsg.data = result.data
        trackMsg.copyText = buildTrackingText(result.data)
        trackQuery('success', result.data.carrier_name || '')
        if (result.free_queries_left !== undefined) freeQueriesLeft.value = result.free_queries_left
      }
    }

    isQuerying.value = false
    return
  }

  // No DeepSeek: static mode
  if (parsed && parsed.type === 'help') {
    messages.push({ id: ++msgId, role: 'system', type: 'text', text: HELP_TEXT })
    isQuerying.value = false
    return
  }

  if (parsed && parsed.type === 'invalid') {
    messages.push({ id: ++msgId, role: 'system', type: 'warn', text: INVALID_TEXT })
    isQuerying.value = false
    return
  }

  if (!parsed || parsed.type !== 'query') {
    isQuerying.value = false
    return
  }

  const thinkingIdx = messages.length
  messages.push({ id: ++msgId, role: 'system', type: 'thinking' })

  const result = await queryTracking(keys.uapi, parsed, token.value)
  const thinkMsg = messages[thinkingIdx]

  if (result.error) {
    thinkMsg.type = (result.status === 404 || result.code === 'free_quota_exhausted') ? 'warn' : 'error'
    thinkMsg.text = getErrorMessage(result.status, result.message, result.code)
    trackQuery('failed')
  } else {
    thinkMsg.type = 'tracking'
    thinkMsg.data = result.data
    thinkMsg.copyText = buildTrackingText(result.data)
    trackQuery('success', result.data.carrier_name || '')
    if (result.free_queries_left !== undefined) freeQueriesLeft.value = result.free_queries_left
  }

  isQuerying.value = false
}

function handleCopyText(msg) {
  const text = msg.copyText || msg.text || ''
  copyText(text).then(() => showToast('已复制到剪贴板')).catch(() => showToast('复制失败'))
}

function handleExportImage(idx) {
  const msg = messages[idx]
  if (!msg?.data) { showToast('无数据可导出'); return }
  captureTrackingResult(msg.data, 'download').then(() => showToast('图片已下载')).catch(e => showToast('导出失败: ' + e.message))
}

function handleCopyImage(idx) {
  const msg = messages[idx]
  if (!msg?.data) { showToast('无数据可复制'); return }
  captureTrackingResult(msg.data, 'clipboard').then(() => showToast('图片已复制到剪贴板')).catch(e => showToast(e.message || '复制图片失败'))
}

let heartbeatTimer = null

onMounted(async () => {
  // Check if app needs setup
  try {
    const res = await fetch('/api/setup/status')
    if (res.ok) {
      const data = await res.json()
      if (!data.initialized) {
        needsSetup.value = true
        setupChecked.value = true
        return
      }
    }
  } catch {}
  setupChecked.value = true
  needsSetup.value = false

  await fetchGlobalConfig()
  await fetchUserGlobal(token.value)
  if (isLoggedIn.value) await checkAdmin()

  // Heartbeat every 60s for online tracking
  if (isLoggedIn.value) {
    heartbeatTimer = setInterval(async () => {
      try { await fetch('/api/admin/heartbeat', { method: 'POST', headers: { Authorization: 'Bearer ' + token.value } }) } catch {}
    }, 60000)
  }

  messages.push({
    id: ++msgId,
    role: 'system',
    type: 'text',
    text: isLoggedIn.value
      ? '👋 <b>欢迎回来！</b> 我是 AI 快递查询助手<br><br>登录用户享受无限次查询，直接输入单号开始吧~'
      : '👋 <b>你好！我是快递查询助手</b><br><br>直接输入快递单号即可查询物流信息。<br><span style="font-size:13px;color:#999;">📌 未登录每天免费查询 10 次，</span><span style="font-size:13px;color:#07c160;">注册登录享受无限次数</span>'
  })
})

onUnmounted(() => { clearInterval(heartbeatTimer) })
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #ededed;
}

.app {
  height: 100vh; display: flex; flex-direction: column; overflow: hidden;
}

.link-btn { color: #576b95; cursor: pointer; text-decoration: underline; background: none; border: none; padding: 0; }

.el-button--success { --el-button-bg-color: #07c160; --el-button-border-color: #07c160; }
.el-button--success:hover { --el-button-bg-color: #06ad56; --el-button-border-color: #06ad56; }
.el-input__wrapper { border-radius: 20px !important; }

.loading-screen {
  height: 100vh; display: flex; align-items: center; justify-content: center; background: #ededed;
}
.loading-spinner {
  width: 40px; height: 40px; border: 4px solid #e0e0e0;
  border-top-color: #07c160; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
