<template>
  <div class="tracking-card">
    <div class="tracking-header">
      <span class="carrier">{{ data.carrier_name || '未知快递' }}</span>
      <span class="number">
        {{ data.tracking_number }}
        <button class="copy-num-btn" title="复制单号" @click.stop="copyNumber">
          <DocumentDuplicateIcon class="copy-num-icon" />
        </button>
      </span>
    </div>

    <el-tag :type="tagType" size="small" class="status-tag">{{ data.status || '未知' }}</el-tag>

    <div v-if="data.tracks && data.tracks.length > 0" class="timeline">
      <TimelineTrack
        v-for="(t, i) in data.tracks"
        :key="i"
        :time="t.time"
        :context="t.context"
        :isLatest="i === 0"
      />
    </div>
    <p v-else class="empty-tracks">暂无物流轨迹信息</p>

    <div v-if="data.is_completed && data.completed_at" class="completed-info">
      ✅ 已于 {{ data.completed_at }} 签收
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DocumentDuplicateIcon } from '@heroicons/vue/24/outline'
import TimelineTrack from './TimelineTrack.vue'
import { copyText } from '../composables/useClipboard.js'

const props = defineProps({ data: Object })
const emit = defineEmits(['toast'])

const tagType = computed(() => {
  const map = {
    delivered: 'success',
    in_transit: '',
    out_for_delivery: 'success',
    pending: 'info',
    picked_up: 'warning',
    exception: 'danger'
  }
  return map[props.data.status_code] || 'info'
})

function copyNumber() {
  copyText(props.data.tracking_number).then(() => emit('toast', '单号已复制')).catch(() => emit('toast', '复制失败'))
}
</script>

<style scoped>
.tracking-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  padding-bottom: 10px; border-bottom: 1px solid #eee;
}
.carrier { font-weight: 600; font-size: 16px; }
.number {
  display: inline-flex; align-items: center; gap: 4px;
  color: #999; font-size: 13px;
}
.copy-num-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  display: inline-flex; align-items: center; opacity: 0.5; transition: opacity 0.12s;
}
.copy-num-btn:hover { opacity: 1; }
.copy-num-icon { width: 14px; height: 14px; color: #07c160; }
.status-tag { margin-bottom: 10px; }
.timeline { position: relative; margin-top: 6px; }
.timeline::before {
  content: ''; position: absolute; left: 2px; top: 4px; bottom: 4px;
  width: 2px; background: #e0e0e0;
}
.empty-tracks { color: #999; font-size: 14px; margin-top: 6px; }
.completed-info { margin-top: 10px; font-size: 13px; color: #2e7d32; }
</style>
