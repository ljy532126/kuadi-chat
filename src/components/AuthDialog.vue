<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="overlay" @click.self="visible = false">
        <div class="card">
          <button class="close-btn" @click="visible = false">
            <XMarkIcon />
          </button>

          <div class="card-header">
            <div class="header-icon" :class="isRegister ? 'icon-reg' : 'icon-login'">
              <UserPlusIcon v-if="isRegister" />
              <ArrowRightEndOnRectangleIcon v-else />
            </div>
            <h2>{{ isRegister ? '创建账号' : '欢迎回来' }}</h2>
            <p>{{ isRegister ? '注册后享受无限次查询' : '登录以享受无限次查询' }}</p>
          </div>

          <div class="card-body">
            <div class="input-group">
              <EnvelopeIcon class="input-icon" />
              <input v-model="em" type="text" placeholder="邮箱地址" autocomplete="off" @keydown.enter="handleSubmit" />
            </div>
            <div class="input-group">
              <LockClosedIcon class="input-icon" />
              <input v-model="pw" type="password" placeholder="密码（至少6位）" autocomplete="new-password" @keydown.enter="handleSubmit" />
            </div>

            <p class="error-msg" v-if="error">{{ error }}</p>

            <button class="submit-btn" :disabled="!em || pw.length < 6 || loading" @click="handleSubmit">
              <span v-if="loading" class="spinner"></span>
              <span v-else>{{ isRegister ? '注 册' : '登 录' }}</span>
            </button>
          </div>

          <div class="card-footer">
            <span>{{ isRegister ? '已有账号？' : '没有账号？' }}</span>
            <button class="switch-btn" @click="toggleMode">{{ isRegister ? '去登录' : '去注册' }}</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { XMarkIcon, UserPlusIcon, ArrowRightEndOnRectangleIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => {
  visible.value = v
  if (v) { em.value = ''; pw.value = ''; error.value = '' }
})
watch(visible, v => emit('update:modelValue', v))

const isRegister = ref(false)
const em = ref('')
const pw = ref('')
const error = ref('')
const loading = ref(false)

function toggleMode() {
  isRegister.value = !isRegister.value
  error.value = ''
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const url = isRegister.value ? '/api/auth/register' : '/api/auth/login'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em.value, password: pw.value })
    })

    let data = {}
    try { data = await res.json() } catch { data = {} }

    if (!res.ok) throw new Error(data.error || '请求失败 (' + res.status + ')')
    if (data.token) {
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_email', data.email)
      emit('update:modelValue', false)
      window.location.reload()
    } else if (data.ok && isRegister.value) {
      // Already registered — don't leak, show the login form
      isRegister.value = false
      error.value = ''
    }
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; backdrop-filter: blur(4px);
}

.card {
  background: #fff; border-radius: 20px; width: 400px; max-width: 92vw;
  overflow: hidden; position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
  animation: slideUp 0.3s ease;
}
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.close-btn {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: rgba(0,0,0,0.04); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.close-btn:hover { background: rgba(0,0,0,0.08); }
.close-btn :deep(svg) { width: 18px; height: 18px; color: #999; }

/* Header */
.card-header {
  padding: 32px 32px 0; text-align: center;
}
.header-icon {
  width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
}
.header-icon :deep(svg) { width: 28px; height: 28px; color: #fff; }
.icon-reg { background: linear-gradient(135deg, #07c160, #05a34f); }
.icon-login { background: linear-gradient(135deg, #576b95, #4a5d85); }

.card-header h2 { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.card-header p { font-size: 13px; color: #999; }

/* Body */
.card-body {
  padding: 24px 32px 20px; display: flex; flex-direction: column; gap: 14px;
}

.input-group {
  position: relative; display: flex; align-items: center;
}
.input-icon {
  position: absolute; left: 14px; width: 20px; height: 20px; color: #bbb;
  pointer-events: none; z-index: 1;
}
.input-group input {
  width: 100%; height: 48px; padding: 0 14px 0 44px;
  border: 1.5px solid #e8e8e8; border-radius: 12px;
  font-size: 15px; color: #333; outline: none;
  background: #fafafa; transition: border-color 0.2s, box-shadow 0.2s;
}
.input-group input:focus {
  border-color: #07c160;
  box-shadow: 0 0 0 3px rgba(7,193,96,0.08);
  background: #fff;
}
.input-group input::placeholder { color: #ccc; }

.error-msg {
  color: #f56c6c; font-size: 13px; padding: 0 4px; margin-top: -6px;
}

.submit-btn {
  width: 100%; height: 48px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #07c160, #05a34f);
  color: #fff; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s, transform 0.1s;
  margin-top: 4px; display: flex; align-items: center; justify-content: center;
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.spinner {
  width: 22px; height: 22px; border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
.card-footer {
  padding: 14px 32px 24px; text-align: center;
  font-size: 13px; color: #999; border-top: 1px solid #f5f5f5;
}
.switch-btn {
  background: none; border: none; color: #07c160; font-size: 13px;
  font-weight: 500; cursor: pointer; padding: 0 2px;
}
.switch-btn:hover { text-decoration: underline; }

/* Transition */
.fade-enter-active { transition: opacity 0.25s ease; }
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
