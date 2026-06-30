<template>
  <div class="toast" v-if="visible">{{ message }}</div>
</template>

<script setup>
defineProps({
  message: String,
  visible: Boolean
})
</script>

<style scoped>
.toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.78); color: #fff; font-size: 14px;
  padding: 8px 20px; border-radius: 20px; z-index: 999;
  animation: toastIn 0.25s ease;
  pointer-events: none;
}
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
