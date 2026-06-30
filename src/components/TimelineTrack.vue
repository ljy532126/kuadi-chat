<template>
  <div class="timeline-item" :class="{ latest: isLatest }">
    <div class="timeline-time" :class="{ 'time-latest': isLatest }">{{ time }}</div>
    <div class="timeline-context" :class="{ 'ctx-latest': isLatest }">{{ context }}</div>
  </div>
</template>

<script setup>
defineProps({
  time: String,
  context: String,
  isLatest: Boolean
})
</script>

<style scoped>
.timeline-item { position: relative; margin-bottom: 12px; padding-left: 20px; }
.timeline-item:last-child { margin-bottom: 0; }
.timeline-item::before {
  content: ''; position: absolute; left: -3px; top: 4px;
  width: 10px; height: 10px; border-radius: 50%; background: #ccc;
  border: 2px solid #fff; z-index: 1;
}
.timeline-item.latest::before { background: #07c160; box-shadow: 0 0 0 4px rgba(7,193,96,0.15); }
.timeline-time { font-size: 12px; color: #999; margin-bottom: 2px; }
.timeline-context { font-size: 14px; color: #333; line-height: 1.5; }
.time-latest { color: #07c160; font-weight: 500; }
.ctx-latest { color: #07c160; font-weight: 500; }
</style>
