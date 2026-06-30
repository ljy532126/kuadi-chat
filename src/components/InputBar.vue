<template>
  <div class="input-bar">
    <div v-if="clipText" class="clip-chip" @click="sendClip">
      <ClipboardDocumentIcon class="clip-icon" />
      <span class="clip-label">{{ clipText }}</span>
      <span class="clip-action">点击发送</span>
    </div>
    <div class="input-row">
      <el-input
        ref="inputRef"
        v-model="text"
        placeholder="输入快递单号查询..."
        :disabled="disabled"
        @keydown.enter="handleSend"
        size="large"
        class="msg-input"
      />
      <el-button
        circle
        :disabled="disabled"
        @click="pasteFromClipboard"
        class="paste-btn"
        title="粘贴识别单号"
      >
        <ClipboardDocumentIcon class="paste-icon" />
      </el-button>
      <el-button
        type="success"
        circle
        :disabled="disabled || !text.trim()"
        @click="handleSend"
        class="send-btn"
      >
        <PaperAirplaneIcon class="send-icon" />
      </el-button>
    </div>
    <p class="format-hint">
      <span v-if="!isLoggedIn" class="quota-badge" :class="{ low: quotaLeft <= 3 }">今日剩余 {{ quotaLeft }} 次</span>
      <span v-else class="quota-badge unlimited">✨ 无限查询</span>
      格式: 单号 [承运商代码] [手机后4位]
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { PaperAirplaneIcon } from '@heroicons/vue/24/solid'
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ disabled: Boolean, quotaLeft: Number, isLoggedIn: Boolean })
const emit = defineEmits(['send'])

const text = ref('')
const inputRef = ref(null)
const clipText = ref('')

onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
    checkClipboard()
  })
  window.addEventListener('focus', checkClipboard)
})

async function pasteFromClipboard() {
  try {
    if (navigator.clipboard?.readText) {
      const content = await navigator.clipboard.readText()
      const num = findTrackingNumber(content)
      if (num) {
        emit('send', num)
      } else {
        text.value = content
      }
    }
  } catch {}
}

function findTrackingNumber(str) {
  // Match: two letters + 8-18 digits, OR pure 10-20 digits
  const match = str.match(/\b(?:[a-zA-Z]{2}\d{8,18}|\d{10,20})\b/)
  return match ? match[0] : null
}

async function checkClipboard() {
  try {
    if (!navigator.clipboard?.readText) return
    const content = await navigator.clipboard.readText()
    const num = findTrackingNumber(content)
    clipText.value = num || ''
  } catch {}
}

function sendClip() {
  if (!clipText.value || props.disabled) return
  emit('send', clipText.value)
  clipText.value = ''
}

function handleSend() {
  const val = text.value.trim()
  if (!val || props.disabled) return
  emit('send', val)
  text.value = ''
}
</script>

<style scoped>
.input-bar {
  background: #f7f7f7; border-top: 1px solid #ddd;
  padding: 10px 16px 8px; flex-shrink: 0;
}
.clip-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: #e8f8ee; border: 1px solid #b7ebce; border-radius: 8px;
  padding: 6px 12px; margin-bottom: 8px; cursor: pointer;
  font-size: 13px; animation: msgIn 0.25s ease;
  transition: background 0.12s; max-width: 100%;
}
.clip-chip:hover { background: #d0f2dc; }
.clip-icon { width: 16px; height: 16px; color: #07c160; flex-shrink: 0; }
.clip-label { font-family: monospace; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.clip-action { color: #07c160; font-weight: 500; flex-shrink: 0; margin-left: auto; }
.input-row { display: flex; gap: 8px; align-items: center; }
.msg-input { flex: 1; }
.send-btn { flex-shrink: 0; }
.paste-btn { flex-shrink: 0; background: #fff; border-color: #ddd; }
.paste-btn:hover { background: #f5f5f5; border-color: #07c160; }
.paste-icon { width: 18px; height: 18px; color: #666; }
.paste-btn:hover .paste-icon { color: #07c160; }
.send-icon { width: 20px; height: 20px; }
.format-hint { font-size: 12px; color: #aaa; margin-top: 6px; text-align: center; }
.quota-badge {
  display: inline-block; padding: 1px 8px; border-radius: 10px;
  font-size: 11px; background: #e8f5e9; color: #07c160; margin-right: 6px; font-weight: 500;
}
.quota-badge.low { background: #fff3e0; color: #e65100; }
.quota-badge.unlimited { background: #e3f2fd; color: #1565c0; }
@keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
