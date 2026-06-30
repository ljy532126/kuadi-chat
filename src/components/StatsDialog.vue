<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>📊 数据统计</h3>
          <button class="close-btn" @click="close">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="drawer-body">
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value">{{ stats.totalVisits }}</div><div class="stat-label">总访问量</div></div>
            <div class="stat-card accent"><div class="stat-value">{{ stats.todayVisits }}</div><div class="stat-label">今日访问</div></div>
            <div class="stat-card"><div class="stat-value">{{ stats.totalQueries }}</div><div class="stat-label">总查询次数</div></div>
            <div class="stat-card accent"><div class="stat-value">{{ stats.todayQueries }}</div><div class="stat-label">今日查询</div></div>
            <div class="stat-card ok"><div class="stat-value">{{ stats.successQueries }}</div><div class="stat-label">查询成功</div></div>
            <div class="stat-card fail"><div class="stat-value">{{ stats.failedQueries }}</div><div class="stat-label">查询失败</div></div>
          </div>

          <div v-if="Object.keys(stats.byCarrier).length" class="carrier-section">
            <div class="section-title">按快递公司</div>
            <div class="carrier-list">
              <div v-for="(cnt, name) in stats.byCarrier" :key="name" class="carrier-row">
                <span>{{ name }}</span>
                <span class="carrier-cnt">{{ cnt }} 次</span>
              </div>
            </div>
          </div>

          <p class="stat-note">数据保存在服务端，跨设备同步。</p>
        </div>

        <div class="drawer-footer">
          <el-popconfirm title="确认清除所有统计数据？" @confirm="handleClear">
            <template #reference>
              <el-button type="danger" plain size="small">清除数据</el-button>
            </template>
          </el-popconfirm>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean, stats: Object })
const emit = defineEmits(['update:modelValue', 'clear'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => emit('update:modelValue', v))

function close() { visible.value = false }
function handleClear() { emit('clear'); visible.value = false }
</script>

<style scoped>
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000;
}
.drawer-panel {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 400px; max-width: 92vw; background: #fff;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.1);
}

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #f0f0f0;
}
.drawer-header h3 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.close-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; }
.close-btn:hover { background: #f5f5f5; }
.close-icon { width: 20px; height: 20px; color: #999; }

.drawer-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; }

.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat-card { background: #f5f5f5; border-radius: 10px; padding: 14px 8px; text-align: center; }
.stat-card.accent { background: #e3f2fd; }
.stat-card.ok { background: #e8f5e9; }
.stat-card.fail { background: #fff0f0; }
.stat-value { font-size: 24px; font-weight: 700; color: #333; }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }
.carrier-section { display: flex; flex-direction: column; gap: 6px; }
.section-title { font-size: 13px; font-weight: 600; color: #666; }
.carrier-row { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 2px 0; }
.carrier-cnt { color: #999; }
.stat-note { font-size: 11px; color: #bbb; text-align: center; }

.drawer-footer {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 16px 24px; border-top: 1px solid #f0f0f0;
}

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
