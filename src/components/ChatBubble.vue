<template>
  <div class="msg-row" :class="'msg-row-' + message.role">
    <!-- System avatar (left) -->
    <div class="avatar" v-if="message.role === 'system' && message.type !== 'thinking'">
      <div class="avatar-icon avatar-bot">
        <CubeIcon />
      </div>
    </div>
    <div class="avatar avatar-placeholder" v-else-if="message.role === 'system'"></div>

    <div class="message" :class="'message-' + message.role">
      <div class="bubble" :class="bubbleClass" ref="bubbleRef">
        <template v-if="message.role === 'user'">{{ message.text }}</template>

        <template v-else-if="message.type === 'text' || message.type === 'error' || message.type === 'warn'">
          <span v-html="message.text"></span>
        </template>

        <template v-else-if="message.type === 'tracking'">
          <TrackingCard :data="message.data" @toast="msg => $emit('toast', msg)" />
        </template>

        <template v-else-if="message.type === 'thinking'">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </template>
      </div>

      <div class="msg-actions" v-if="showActions">
        <button class="act-btn" title="复制文本" @click.stop="$emit('copy-text')">
          <DocumentDuplicateIcon class="act-icon" />
        </button>
        <template v-if="message.type === 'tracking'">
          <button class="act-btn" title="导出为图片" @click.stop="$emit('export-image')">
            <ArrowDownTrayIcon class="act-icon" />
          </button>
          <button class="act-btn" title="复制为图片" @click.stop="$emit('copy-image')">
            <PhotoIcon class="act-icon" />
          </button>
        </template>
      </div>
    </div>

    <!-- User avatar (right) -->
    <div class="avatar" v-if="message.role === 'user'">
      <div class="avatar-icon avatar-user">
        <img v-if="userAvatar" :src="userAvatar" class="user-avatar-img" alt="头像" />
        <UserIcon v-else class="avatar-svg" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DocumentDuplicateIcon, ArrowDownTrayIcon, PhotoIcon, UserIcon, CubeIcon } from '@heroicons/vue/24/outline'
import TrackingCard from './TrackingCard.vue'

const props = defineProps({
  message: Object,
  userAvatar: String
})
defineEmits(['copy-text', 'export-image', 'copy-image', 'toast'])

const bubbleRef = ref(null)

const bubbleClass = computed(() => {
  if (props.message.role === 'user') return 'bubble-user'
  if (props.message.type === 'error') return 'bubble-error'
  if (props.message.type === 'warn') return 'bubble-warning'
  return 'bubble-system'
})

const showActions = computed(() => {
  return props.message.type === 'text'
    || props.message.type === 'error'
    || props.message.type === 'warn'
    || props.message.type === 'tracking'
})

defineExpose({ bubbleRef })
</script>

<style scoped>
.msg-row {
  display: flex; gap: 10px; align-items: flex-start;
  animation: msgIn 0.25s ease;
}
.msg-row-user { flex-direction: row; justify-content: flex-end; }
.msg-row-system { flex-direction: row; }

.avatar {
  flex-shrink: 0; width: 36px; height: 36px;
}
.avatar-placeholder { visibility: hidden; }

.avatar-icon {
  width: 36px; height: 36px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.avatar-bot {
  background: linear-gradient(135deg, #07c160, #05a34f);
  color: #fff;
}
.avatar-user {
  background: linear-gradient(135deg, #576b95, #4a5d85);
  color: #fff;
}
.avatar-icon :deep(svg) { width: 20px; height: 20px; }
.avatar-svg { width: 20px; height: 20px; }
.user-avatar-img { width: 36px; height: 36px; object-fit: cover; }

.message { max-width: 70%; display: flex; flex-direction: column; }
.message-user { align-items: flex-end; }
.message-system { align-items: flex-start; }

.bubble {
  padding: 10px 14px; border-radius: 8px; font-size: 15px;
  line-height: 1.5; word-break: break-word;
}
.bubble-user { background: #95ec69; }
.bubble-system { background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.bubble-error { background: #fff0f0; border: 1px solid #ffd4d4; }
.bubble-warning { background: #fff9f0; border: 1px solid #ffe4b8; }

.msg-actions {
  display: flex; gap: 4px; margin-top: 4px;
  opacity: 0; transition: opacity 0.15s ease; pointer-events: none;
}
.msg-row:hover .msg-actions { opacity: 1; pointer-events: auto; }
.message-user .msg-actions { justify-content: flex-end; }

.act-btn {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid #ddd;
  background: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s; padding: 2px;
}
.act-btn:hover { background: #f0f0f0; }
.act-btn:active { background: #e0e0e0; }
.act-icon { width: 16px; height: 16px; color: #666; }

.typing-dots { display: flex; gap: 4px; padding: 4px 0; }
.typing-dots span {
  width: 8px; height: 8px; border-radius: 50%; background: #bbb;
  animation: dotPulse 1.4s infinite ease-in-out both;
}
.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
