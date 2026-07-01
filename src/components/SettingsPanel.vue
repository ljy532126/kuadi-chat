<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>⚙️ API 密钥配置</h3>
          <button class="close-btn" @click="close"><XMarkIcon class="close-icon" /></button>
        </div>

        <div class="drawer-body">
          <div v-if="usingGlobal" class="global-notice">
            正在使用管理员配置的全局 API Key
          </div>
          <div v-else-if="globalEnabledView && !usingGlobal" class="global-notice warn">
            管理员已开启全局 API，但你的账号未开通全局使用权限。<br>
            <span v-if="adminContactView">请联系管理员：{{ adminContactView }}<br></span>
            或自行填写以下密钥。
          </div>

          <!-- UAPI -->
          <div class="key-section">
            <div class="section-header">
              <span class="section-title">📦 快递查询 API</span>
              <span class="status-dot" :class="uapiOk ? 'ok' : 'miss'"></span>
            </div>
            <p class="section-desc">用于查询快递物流信息，在 <a href="https://uapis.cn" target="_blank" rel="noopener" class="link">uapis.cn</a> 获取</p>
            <el-input v-model="localUapi" type="password" show-password placeholder="输入完整密钥" size="default" clearable />
            <div class="test-row" v-if="localUapi">
              <el-button size="small" :loading="testingUapi" @click="testUapi" :disabled="!localUapi.trim()">测试连接</el-button>
              <span v-if="testUapiResult" :class="testUapiResult.ok ? 'test-ok' : 'test-fail'">{{ testUapiResult.msg }}</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- DeepSeek -->
          <div class="key-section">
            <div class="section-header">
              <span class="section-title">🤖 DeepSeek AI</span>
              <span class="status-dot" :class="dsOk ? 'ok' : 'miss'"></span>
            </div>
            <p class="section-desc">配置后可智能对话，在 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" class="link">platform.deepseek.com</a> 获取</p>
            <el-input v-model="localDeepseek" type="password" show-password placeholder="sk-..." size="default" clearable />
            <div class="test-row" v-if="localDeepseek">
              <el-button size="small" :loading="testingDs" @click="testDeepseek" :disabled="!localDeepseek.trim()">测试连接</el-button>
              <span v-if="testDsResult" :class="testDsResult.ok ? 'test-ok' : 'test-fail'">{{ testDsResult.msg }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <el-button @click="handleClearAll">清除全部</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ uapiKey: String, deepseekKey: String, visible: Boolean, usingGlobal: Boolean, globalEnabledView: Boolean, adminContactView: String })
const emit = defineEmits(['save-uapi', 'save-deepseek', 'clear-all', 'update:visible'])

const localUapi = ref(props.uapiKey)
const localDeepseek = ref(props.deepseekKey)
const testingUapi = ref(false)
const testUapiResult = ref(null)
const testingDs = ref(false)
const testDsResult = ref(null)

const uapiOk = computed(() => !!localUapi.value)
const dsOk = computed(() => !!localDeepseek.value)

watch(() => props.visible, v => {
  if (v) { localUapi.value = props.uapiKey; localDeepseek.value = props.deepseekKey; testUapiResult.value = null; testDsResult.value = null }
})
watch(() => props.uapiKey, v => { localUapi.value = v })
watch(() => props.deepseekKey, v => { localDeepseek.value = v })

function close() { emit('update:visible', false) }

function handleSave() {
  emit('save-uapi', localUapi.value)
  emit('save-deepseek', localDeepseek.value)
  close()
}

function handleClearAll() {
  localUapi.value = ''; localDeepseek.value = ''
  testUapiResult.value = null; testDsResult.value = null
  emit('clear-all')
}

async function testUapi() {
  testingUapi.value = true; testUapiResult.value = null
  try {
    const key = localUapi.value.trim()
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const url = new URL('/api/v1/misc/tracking/query', window.location.origin)
    url.searchParams.set('tracking_number', 'JT0000000000')
    const resp = await fetch(url.toString(), {
      headers: { 'X-Uapi-Key': 'Bearer ' + key },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (resp.status === 401 || resp.status === 403) {
      testUapiResult.value = { ok: false, msg: '密钥无效' }
    } else {
      testUapiResult.value = { ok: true, msg: '连接成功 (' + resp.status + ')' }
    }
  } catch {
    testUapiResult.value = { ok: false, msg: 'UAPI 服务超时，请稍后重试' }
  }
  testingUapi.value = false
}

async function testDeepseek() {
  testingDs.value = true; testDsResult.value = null
  try {
    const resp = await fetch('/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ds-Key': 'Bearer ' + localDeepseek.value.trim()
      },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
    })
    if (resp.ok) {
      testDsResult.value = { ok: true, msg: '连接成功 ✅' }
    } else if (resp.status === 401) {
      testDsResult.value = { ok: false, msg: '密钥无效' }
    } else if (resp.status === 402) {
      testDsResult.value = { ok: false, msg: '余额不足' }
    } else {
      testDsResult.value = { ok: false, msg: '状态 ' + resp.status }
    }
  } catch { testDsResult.value = { ok: false, msg: '网络错误' } }
  testingDs.value = false
}
</script>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; }
.drawer-panel { position: absolute; top: 0; right: 0; bottom: 0; width: 400px; max-width: 92vw; background: #fff; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.1); }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f0; }
.drawer-header h3 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.close-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; }
.close-btn:hover { background: #f5f5f5; }
.close-icon { width: 20px; height: 20px; color: #999; }
.drawer-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.global-notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #92400e; line-height: 1.5; }
.global-notice.warn { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
.key-section { display: flex; flex-direction: column; gap: 6px; }
.section-header { display: flex; align-items: center; gap: 8px; }
.section-title { font-weight: 600; font-size: 15px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.ok { background: #07c160; }
.status-dot.miss { background: #ddd; }
.section-desc { font-size: 12px; color: #999; }
.divider { height: 1px; background: #f0f0f0; }
.test-row { display: flex; align-items: center; gap: 10px; }
.test-ok { color: #07c160; font-size: 13px; }
.test-fail { color: #e6a23c; font-size: 13px; }
.drawer-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #f0f0f0; }
.link { color: #07c160; text-decoration: none; font-weight: 500; }
.link:hover { text-decoration: underline; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
