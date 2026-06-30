<template>
  <div class="chat-container" ref="containerRef">
    <TransitionGroup name="msg">
      <ChatBubble
        v-for="(msg, i) in messages"
        :key="msg.id"
        :message="msg"
        :userAvatar="userAvatar"
        :ref="el => setBubbleRef(i, el)"
        @copy-text="handleCopyText(msg, i)"
        @export-image="handleExportImage(i)"
        @copy-image="handleCopyImage(i)"
        @toast="msg => emit('toast', msg)"
      />
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import ChatBubble from './ChatBubble.vue'

const props = defineProps({
  messages: Array,
  userAvatar: String,
  onCopyText: Function,
  onExportImage: Function,
  onCopyImage: Function
})

const emit = defineEmits(['copy-text', 'export-image', 'copy-image', 'toast'])
const containerRef = ref(null)
const bubbleRefs = ref({})

function setBubbleRef(i, el) { if (el) bubbleRefs.value[i] = el }

function handleCopyText(msg, i) { emit('copy-text', msg, i) }
function handleExportImage(i) { emit('export-image', i) }
function handleCopyImage(i) { emit('copy-image', i) }

function scrollBottom() {
  nextTick(() => {
    if (containerRef.value) containerRef.value.scrollTop = containerRef.value.scrollHeight
  })
}

watch(() => props.messages.length, scrollBottom)

defineExpose({ scrollBottom, bubbleRefs })
</script>

<style scoped>
.chat-container {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.chat-container::-webkit-scrollbar { width: 6px; }
.chat-container::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

.msg-enter-active { animation: msgIn 0.25s ease; }
.msg-leave-active { display: none; }
@keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
