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
import { ref, onMounted, watch, nextTick } from 'vue'
import { PaperAirplaneIcon } from '@heroicons/vue/24/solid'

const props = defineProps({ disabled: Boolean, quotaLeft: Number, isLoggedIn: Boolean })
const emit = defineEmits(['send'])

const text = ref('')
const inputRef = ref(null)

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

onMounted(focusInput)

// Auto re-focus after query finishes
watch(() => props.disabled, (v) => { if (!v) focusInput() })

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
.format-hint { font-size: 12px; color: #aaa; margin-top: 6px; text-align: center; }
.quota-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; background: #e8f5e9; color: #07c160; margin-right: 6px; font-weight: 500; }
.quota-badge.low { background: #fff3e0; color: #e65100; }
.quota-badge.unlimited { background: #e3f2fd; color: #1565c0; }
</style>
