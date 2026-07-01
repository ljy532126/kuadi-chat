<template>
  <div class="input-bar">
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
        @click="pasteAndSend"
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
      <span v-else class="quota-badge unlimited">无限查询</span>
      格式: 单号 [承运商代码] [手机后4位]
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { PaperAirplaneIcon } from '@heroicons/vue/24/solid'
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ disabled: Boolean, quotaLeft: Number, isLoggedIn: Boolean })
const emit = defineEmits(['send'])

const text = ref('')
const inputRef = ref(null)

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

onMounted(focusInput)

watch(() => props.disabled, (v) => { if (!v) focusInput() })

async function pasteAndSend() {
  try {
    if (!navigator.clipboard?.readText) return
    const content = (await navigator.clipboard.readText()).trim()
    if (!content) return
    // Extract tracking number: 2-4 letters + 8-18 digits, or pure 10-20 digits
    const match = content.match(/(?:[a-zA-Z]{2,4}\d{8,18}|\d{10,20})/)
    if (match) {
      emit('send', match[0])
    } else {
      text.value = content
      focusInput()
    }
  } catch {}
}

function handleSend() {
  const val = text.value.trim()
  if (!val) return
  emit('send', val)
  text.value = ''
}
</script>

<style scoped>
.input-bar { background: #f7f7f7; border-top: 1px solid #ddd; padding: 10px 16px 8px; flex-shrink: 0; }
.input-row { display: flex; gap: 8px; align-items: center; }
.msg-input { flex: 1; }
.send-btn { flex-shrink: 0; }
.send-icon { width: 20px; height: 20px; }
.paste-btn { flex-shrink: 0; background: #fff; border-color: #ddd; }
.paste-btn:hover { background: #f5f5f5; border-color: #07c160; }
.paste-icon { width: 18px; height: 18px; color: #666; }
.paste-btn:hover .paste-icon { color: #07c160; }
.format-hint { font-size: 12px; color: #aaa; margin-top: 6px; text-align: center; }
.quota-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; background: #e8f5e9; color: #07c160; margin-right: 6px; font-weight: 500; }
.quota-badge.low { background: #fff3e0; color: #e65100; }
.quota-badge.unlimited { background: #e3f2fd; color: #1565c0; }
</style>
