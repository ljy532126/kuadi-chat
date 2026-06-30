<template>
  <div class="wizard">
    <div class="wizard-card">
      <div class="step-indicator">
        <div v-for="s in steps" :key="s" class="step" :class="{ active: step === s, done: step > s }">
          <div class="step-dot">{{ step > s ? '✓' : s }}</div>
          <span class="step-name">{{ stepNames[s] }}</span>
        </div>
      </div>

      <div class="wizard-body">
        <!-- Step 1: Database -->
        <div v-if="step === 1" class="step-content">
          <div class="hero-icon">📦</div>
          <h2>欢迎安装快递查询助手</h2>
          <p class="subtitle">抖音小友同学出品 · 首次运行配置向导</p>

          <div class="form-group">
            <label>MongoDB 连接地址</label>
            <el-input v-model="form.mongoUri" placeholder="mongodb://localhost:27017/tracking" size="large" />
            <span class="hint">使用 Docker 一键部署或填写已有数据库地址</span>
          </div>

          <div class="form-group">
            <label>JWT 加密密钥</label>
            <el-input v-model="form.jwtSecret" placeholder="留空自动生成随机密钥" size="large" />
            <span class="hint">用于登录令牌加密，建议填写随机字符串</span>
          </div>
        </div>

        <!-- Step 2: Admin -->
        <div v-if="step === 2" class="step-content">
          <div class="hero-icon">🛡️</div>
          <h2>创建管理员账号</h2>
          <p class="subtitle">管理员可以配置全局 API Key 和管理系统</p>

          <div class="form-group">
            <label>管理员邮箱</label>
            <el-input v-model="form.adminEmail" placeholder="admin@example.com" size="large" />
          </div>
          <div class="form-group">
            <label>管理员密码</label>
            <el-input v-model="form.adminPassword" type="password" show-password placeholder="至少6位" size="large" />
          </div>
        </div>

        <!-- Step 3: API Keys -->
        <div v-if="step === 3" class="step-content">
          <div class="hero-icon">🔑</div>
          <h2>API 密钥（可选）</h2>
          <p class="subtitle">可跳过，后续在管理后台配置</p>

          <div class="form-group">
            <label>UAPI 快递查询密钥</label>
            <el-input v-model="form.uapiKey" type="password" show-password placeholder="在 uapis.cn 获取" size="large" />
            <span class="hint">在 <a href="https://uapis.cn" target="_blank" class="key-link">uapis.cn</a> 注册获取，用于查询快递物流信息</span>
          </div>
          <div class="form-group">
            <label>DeepSeek AI 密钥</label>
            <el-input v-model="form.deepseekKey" type="password" show-password placeholder="sk-..." size="large" />
            <span class="hint">在 <a href="https://platform.deepseek.com/api_keys" target="_blank" class="key-link">platform.deepseek.com</a> 获取，用于 AI 智能对话</span>
          </div>
          <div class="form-group">
            <el-checkbox v-model="form.enableGlobal">安装后立即启用全局密钥</el-checkbox>
          </div>
        </div>

        <!-- Step 4: Install -->
        <div v-if="step === 4" class="step-content">
          <div class="hero-icon">{{ installing ? '⏳' : done ? '🎉' : '🚀' }}</div>
          <h2>{{ done ? '安装完成！' : installing ? '正在安装...' : '确认安装' }}</h2>
          <p v-if="!done && !installing" class="subtitle">点击下方按钮开始初始化</p>
          <div v-if="installing" class="install-log" ref="logRef">
            <div v-for="(line, i) in logs" :key="i" class="log-line">{{ line }}</div>
          </div>
          <div v-if="done" class="done-info">
            <p>管理员 {{ form.adminEmail }} 已创建</p>
            <p class="hint">请重启服务以应用新配置</p>
          </div>
          <p v-if="error" class="err">{{ error }}</p>
        </div>
      </div>

      <div class="wizard-footer">
        <el-button v-if="step > 1 && !done" @click="step--" :disabled="installing">上一步</el-button>
        <el-button v-if="step === 1" @click="skipSetup" type="info" plain :disabled="installing">跳过安装</el-button>
        <el-button v-if="step < 3" type="primary" @click="step++">下一步</el-button>
        <el-button v-if="step === 3" type="primary" @click="step = 4">确认配置</el-button>
        <el-button v-if="step === 4 && !done && !installing" type="primary" @click="doInstall">开始安装</el-button>
        <el-button v-if="done" type="primary" @click="goApp">进入系统</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'

const emit = defineEmits(['done'])

const step = ref(1)
const steps = [1, 2, 3, 4]
const stepNames = { 1: '数据库', 2: '管理员', 3: '密钥', 4: '安装' }

const form = reactive({
  mongoUri: 'mongodb://localhost:27017/tracking',
  jwtSecret: '',
  adminEmail: '',
  adminPassword: '',
  uapiKey: '',
  deepseekKey: '',
  enableGlobal: false
})

const installing = ref(false)
const done = ref(false)
const error = ref('')
const logs = ref([])
const logRef = ref(null)

function addLog(msg) {
  logs.value.push(msg)
  nextTick(() => { if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight })
}

async function doInstall() {
  installing.value = true
  error.value = ''
  logs.value = []

  addLog('正在初始化...')

  if (!form.jwtSecret) {
    form.jwtSecret = 'kuaidi_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    addLog('已生成随机 JWT 密钥')
  }

  try {
    addLog('正在创建管理员账号...')
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        mongoUri: form.mongoUri,
        jwtSecret: form.jwtSecret,
        uapiKey: form.uapiKey,
        deepseekKey: form.deepseekKey,
        enableGlobal: form.enableGlobal
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || '安装失败')
    }

    if (data.token) {
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_email', data.email)
    }

    addLog('✅ 管理员账号创建成功')
    addLog('✅ 全局配置已保存')
    addLog('✅ .env 文件已写入')

    done.value = true
    addLog('🎉 安装完成！')
  } catch (e) {
    error.value = e.message
    addLog('❌ ' + e.message)
  }
  installing.value = false
}

function skipSetup() {
  // Just reload — the setup API will be called when user first interacts
  window.location.reload()
}

function goApp() {
  window.location.reload()
}
</script>

<style scoped>
.wizard {
  position: fixed; inset: 0; z-index: 9999;
  background: linear-gradient(135deg, #07c160 0%, #05a34f 50%, #2b5876 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.wizard-card {
  background: #fff; border-radius: 20px; width: 520px; max-width: 100%;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  overflow: hidden; display: flex; flex-direction: column;
}

/* Step indicator */
.step-indicator {
  display: flex; justify-content: center; gap: 32px;
  padding: 24px 32px 0;
}
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: 0.35; }
.step.active { opacity: 1; }
.step.done { opacity: 1; }
.step-dot {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  background: #f0f0f0; color: #999;
  transition: all 0.3s;
}
.step.active .step-dot { background: #07c160; color: #fff; }
.step.done .step-dot { background: #07c160; color: #fff; }
.step-name { font-size: 12px; color: #666; font-weight: 500; }

/* Body */
.wizard-body {
  padding: 28px 32px 20px; flex: 1; overflow-y: auto;
}
.step-content { display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { font-size: 48px; margin-bottom: 12px; }
h2 { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.subtitle { font-size: 13px; color: #999; margin-bottom: 20px; }

.form-group {
  width: 100%; text-align: left; margin-bottom: 14px;
}
.form-group label { font-size: 13px; font-weight: 600; color: #555; display: block; margin-bottom: 4px; }
.hint { font-size: 11px; color: #bbb; margin-top: 4px; display: block; }

.install-log {
  background: #1a1a1a; color: #0f0; border-radius: 10px;
  padding: 12px 16px; width: 100%; max-height: 160px; overflow-y: auto;
  text-align: left; font-family: monospace; font-size: 12px; margin-top: 12px;
}
.log-line { padding: 1px 0; }
.done-info { margin-top: 8px; }
.done-info p { color: #333; }
.err { color: #f56c6c; font-size: 13px; margin-top: 10px; }
.key-link { color: #07c160; text-decoration: none; font-weight: 500; }
.key-link:hover { text-decoration: underline; }

/* Footer */
.wizard-footer {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 16px 32px 24px; border-top: 1px solid #f0f0f0;
}
</style>
