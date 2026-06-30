<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>📢 公告</h3>
          <button class="close-btn" @click="close">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="drawer-body">
          <div class="announce-item">
            <span class="announce-date">2026-06-30</span>
            <p>支持中通、圆通、韵达、申通、极兔、顺丰、京东、EMS、德邦等主流快递查询</p>
          </div>
          <div class="announce-item">
            <span class="announce-date">2026-06-30</span>
            <p>新增导出图片功能，查询结果可保存为精美卡片或复制到剪贴板</p>
          </div>
          <div class="announce-item">
            <span class="announce-date">2026-06-30</span>
            <p>输入"帮助"可查看完整使用指南，输入不规范时自动引导</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => emit('update:modelValue', v))

function close() { visible.value = false }
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

.drawer-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }

.announce-item { padding-bottom: 14px; border-bottom: 1px solid #f0f0f0; }
.announce-item:last-child { border-bottom: none; padding-bottom: 0; }
.announce-date { font-size: 12px; color: #07c160; font-weight: 600; }
.announce-item p { font-size: 14px; color: #333; margin-top: 4px; line-height: 1.6; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
