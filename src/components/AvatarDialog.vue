<template>
  <Transition name="drawer">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3>更换头像</h3>
          <button class="close-btn" @click="close"><XMarkIcon class="close-icon" /></button>
        </div>

        <div class="drawer-body">
          <div class="preview-wrap">
            <div class="preview-avatar">
              <img v-if="previewUrl" :src="previewUrl" alt="预览头像" />
              <UserCircleIcon v-else class="placeholder-icon" />
            </div>
          </div>
          <p class="tip">支持 JPG、PNG 格式，最大 2MB</p>
          <input ref="inputRef" type="file" accept="image/*" class="file-input" @change="handleFile" />
          <div class="btn-row">
            <el-button @click="handleSelect">选择图片</el-button>
            <el-button type="danger" plain @click="handleClear" :disabled="!hasAvatar">移除头像</el-button>
          </div>
          <p v-if="error" class="err-msg">{{ error }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { XMarkIcon, UserCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean, currentAvatar: String })
const emit = defineEmits(['update:modelValue', 'save', 'clear'])

const visible = ref(props.modelValue)
const previewUrl = ref(props.currentAvatar)
const inputRef = ref(null)
const error = ref('')
const hasAvatar = ref(!!props.currentAvatar)

watch(() => props.modelValue, v => { visible.value = v })
watch(() => props.currentAvatar, v => { previewUrl.value = v; hasAvatar.value = !!v })
watch(visible, v => {
  emit('update:modelValue', v)
  if (v) { error.value = ''; previewUrl.value = props.currentAvatar }
})

function close() { visible.value = false }

function handleSelect() { error.value = ''; inputRef.value?.click() }

function handleFile(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { error.value = '请选择图片文件'; return }
  if (file.size > 2 * 1024 * 1024) { error.value = '图片不能超过 2MB'; return }

  const reader = new FileReader()
  reader.onload = () => { previewUrl.value = reader.result; error.value = ''; emit('save', file) }
  reader.onerror = () => { error.value = '读取图片失败' }
  reader.readAsDataURL(file)
}

function handleClear() { previewUrl.value = ''; error.value = ''; emit('clear') }
</script>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; }
.drawer-panel {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 380px; max-width: 92vw; background: #fff;
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

.drawer-body { flex: 1; overflow-y: auto; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; }

.preview-avatar {
  width: 96px; height: 96px; border-radius: 14px; overflow: hidden;
  background: #f5f5f5; display: flex; align-items: center; justify-content: center;
  border: 2px dashed #ddd;
}
.preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
.placeholder-icon { width: 40px; height: 40px; color: #ccc; }
.tip { font-size: 12px; color: #999; }
.file-input { display: none; }
.btn-row { display: flex; gap: 8px; margin-top: 4px; }
.err-msg { font-size: 12px; color: #f56c6c; }

.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-leave-active .drawer-panel { transition: transform 0.2s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
</style>
