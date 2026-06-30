<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>🛡️ 管理员配置</h3>
          <button class="close-btn" @click="close"><XMarkIcon class="close-icon" /></button>
        </div>

        <div class="drawer-body">
          <div class="toggle-section">
            <div class="toggle-row">
              <div>
                <span class="toggle-label">启用全局 API Key</span>
                <p class="toggle-desc">开启后所有用户直接使用管理员配置的密钥</p>
              </div>
              <el-switch v-model="localEnabled" @change="autoSave" />
            </div>
          </div>

          <div class="divider"></div>

          <div class="key-section">
            <div class="section-header">
              <span class="section-title">📦 快递查询 API</span>
              <span class="status-dot" :class="localUapi ? 'ok' : 'miss'"></span>
            </div>
            <el-input v-model="localUapi" type="password" show-password placeholder="全局 UAPI 密钥" size="default" clearable @change="autoSave" />
          </div>

          <div class="divider"></div>

          <div class="key-section">
            <div class="section-header">
              <span class="section-title">🤖 DeepSeek AI</span>
              <span class="status-dot" :class="localDs ? 'ok' : 'miss'"></span>
            </div>
            <el-input v-model="localDs" type="password" show-password placeholder="全局 DeepSeek 密钥" size="default" clearable @change="autoSave" />
          </div>

          <div class="divider"></div>

          <div class="tip-section">
            <p class="tip-text">💡 配置自动保存。管理员邮箱需要在 MongoDB 中设置 role 为 admin。</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean, token: String })
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => emit('update:modelValue', v))

const localEnabled = ref(false)
const localUapi = ref('')
const localDs = ref('')
let saveTimer = null

watch(visible, async (v) => {
  if (!v) return
  try {
    const res = await fetch('/api/admin/config/full', {
      headers: { Authorization: 'Bearer ' + props.token }
    })
    if (res.ok) {
      const data = await res.json()
      localEnabled.value = data.enabled
      localUapi.value = data.uapiKey || ''
      localDs.value = data.deepseekKey || ''
    }
  } catch {}
})

function close() { visible.value = false }

function autoSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(doSave, 500)
}

async function doSave() {
  try {
    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + props.token
      },
      body: JSON.stringify({
        enabled: localEnabled.value,
        uapiKey: localUapi.value,
        deepseekKey: localDs.value
      })
    })
    emit('saved')
  } catch {}
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
.toggle-row { display: flex; align-items: center; justify-content: space-between; }
.toggle-label { font-weight: 600; font-size: 15px; }
.toggle-desc { font-size: 12px; color: #999; margin-top: 2px; }
.key-section { display: flex; flex-direction: column; gap: 6px; }
.section-header { display: flex; align-items: center; gap: 8px; }
.section-title { font-weight: 600; font-size: 15px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.ok { background: #07c160; }
.status-dot.miss { background: #ddd; }
.divider { height: 1px; background: #f0f0f0; }
.tip-text { font-size: 12px; color: #bbb; line-height: 1.6; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
