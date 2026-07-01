<template>
  <div class="wizard">
    <div class="wizard-card">
      <div class="wizard-inner">
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

            <div class="form-row">
              <div class="form-group half">
                <label>MongoDB 主机</label>
                <el-input v-model="form.mongoHost" placeholder="mongo" size="default" />
                <span class="hint">Docker: <code>mongo</code>，本机: <code>localhost</code></span>
              </div>
              <div class="form-group half">
                <label>端口</label>
                <el-input v-model="form.mongoPort" placeholder="27017" size="default" />
              </div>
            </div>
            <div class="form-group">
              <label>数据库名</label>
              <el-input v-model="form.mongoDb" placeholder="tracking" size="default" />
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label>用户名</label>
                <el-input v-model="form.mongoUser" placeholder="留空=无认证" size="default" />
              </div>
              <div class="form-group half">
                <label>密码</label>
                <el-input v-model="form.mongoPass" type="password" show-password placeholder="留空=无认证" size="default" />
              </div>
            </div>

            <div class="test-row">
              <el-button size="small" :loading="testing" @click="testMongo" :disabled="!form.mongoHost">测试数据库连接</el-button>
              <span v-if="testResult" :class="testResult.ok ? 'test-ok' : 'test-fail'">{{ testResult.msg }}</span>
            </div>

            <div class="form-group">
              <label>JWT 加密密钥</label>
              <div class="input-with-btn">
                <el-input v-model="form.jwtSecret" placeholder="点击右侧按钮自动生成" size="default" class="grow" />
                <el-button size="default" @click="generateJwt">🔑 随机生成</el-button>
              </div>
              <span class="hint">用于登录令牌加密，自动生成即可</span>
            </div>
          </div>

          <!-- Step 2: Admin -->
          <div v-if="step === 2" class="step-content">
            <div class="hero-icon">🛡️</div>
            <h2>创建管理员账号</h2>
            <p class="subtitle">管理员可以配置全局 API Key 和管理系统</p>

            <div class="form-group">
              <label>管理员邮箱</label>
              <el-input v-model="form.adminEmail" placeholder="admin@example.com" size="default" />
            </div>
            <div class="form-group">
              <label>管理员密码</label>
              <el-input v-model="form.adminPassword" type="password" show-password placeholder="至少6位" size="default" />
            </div>
          </div>

          <!-- Step 3: API Keys -->
          <div v-if="step === 3" class="step-content">
            <div class="hero-icon">🔑</div>
            <h2>API 密钥（可选）</h2>
            <p class="subtitle">可跳过，后续在管理后台配置</p>

            <div class="form-group">
              <label>UAPI 快递查询密钥</label>
              <el-input v-model="form.uapiKey" type="password" show-password placeholder="在 uapis.cn 获取" size="default" />
              <span class="hint">在 <a href="https://uapis.cn" target="_blank" class="key-link">uapis.cn</a> 注册获取</span>
            </div>
            <div class="form-group">
              <label>DeepSeek AI 密钥</label>
              <el-input v-model="form.deepseekKey" type="password" show-password placeholder="sk-..." size="default" />
              <span class="hint">在 <a href="https://platform.deepseek.com/api_keys" target="_blank" class="key-link">platform.deepseek.com</a> 获取</span>
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
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'

const step = ref(1)
const steps = [1, 2, 3, 4]
const stepNames = { 1: '数据库', 2: '管理员', 3: '密钥', 4: '安装' }

const form = reactive({
  mongoHost: 'mongo',
  mongoPort: '27017',
  mongoDb: 'tracking',
  mongoUser: 'kuaidi',
  mongoPass: 'kuaidi123',
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
const testing = ref(false)
const testResult = ref(null)

function generateJwt() {
  form.jwtSecret = 'kuaidi_' + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function buildMongoUri() {
  let uri = 'mongodb://'
  if (form.mongoUser && form.mongoPass) {
    uri += encodeURIComponent(form.mongoUser) + ':' + encodeURIComponent(form.mongoPass) + '@'
  }
  uri += form.mongoHost + ':' + form.mongoPort + '/' + form.mongoDb
  if (form.mongoUser && form.mongoPass) {
    uri += '?authSource=admin'
  }
  return uri
}

async function testMongo() {
  testing.value = true; testResult.value = null
  try {
    const res = await fetch('/api/setup/test-mongo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mongoUri: buildMongoUri() })
    })
    const data = await res.json()
    testResult.value = res.ok ? { ok: true, msg: '连接成功 ✅' } : { ok: false, msg: data.error || '连接失败' }
  } catch {
    testResult.value = { ok: false, msg: '网络错误 — 后端服务未启动' }
  }
  testing.value = false
}

function addLog(msg) {
  logs.value.push(msg)
  nextTick(() => { if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight })
}

async function doInstall() {
  installing.value = true; error.value = ''; logs.value = []

  addLog('正在初始化...')

  if (!form.jwtSecret) {
    generateJwt()
    addLog('已生成随机 JWT 密钥')
  }

  const mongoUri = buildMongoUri()

  try {
    addLog('正在创建管理员账号...')
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: form.adminEmail, adminPassword: form.adminPassword,
        mongoUri, jwtSecret: form.jwtSecret,
        uapiKey: form.uapiKey, deepseekKey: form.deepseekKey, enableGlobal: form.enableGlobal
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '安装失败')
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

function skipSetup() { window.location.reload() }
function goApp() { window.location.reload() }
</script>

<style scoped>
.wizard {
  position: fixed; inset: 0; z-index: 9999;
  background: linear-gradient(135deg, #07c160 0%, #05a34f 50%, #2b5876 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.wizard-card {
  background: #fff; border-radius: 20px; width: 500px; max-width: 100%; max-height: 90vh;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  overflow: hidden;
}
.wizard-inner {
  display: flex; flex-direction: column; max-height: 90vh;
}

/* Step indicator */
.step-indicator {
  display: flex; justify-content: center; gap: 24px;
  padding: 20px 24px 0; flex-shrink: 0;
}
.step { display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: 0.35; }
.step.active, .step.done { opacity: 1; }
.step-dot {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  background: #f0f0f0; color: #999;
  transition: all 0.3s;
}
.step.active .step-dot, .step.done .step-dot { background: #07c160; color: #fff; }
.step-name { font-size: 11px; color: #666; font-weight: 500; }

/* Body — scrolls when content overflows */
.wizard-body {
  padding: 20px 28px; flex: 1; overflow-y: auto; min-height: 0;
}
.step-content { display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { font-size: 40px; margin-bottom: 8px; }
h2 { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
.subtitle { font-size: 12px; color: #999; margin-bottom: 16px; }

.form-group { width: 100%; text-align: left; margin-bottom: 10px; }
.form-group label { font-size: 12px; font-weight: 600; color: #666; display: block; margin-bottom: 3px; }
.hint { font-size: 10px; color: #bbb; margin-top: 3px; display: block; }
.hint code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; }
.form-row { display: flex; gap: 10px; width: 100%; }
.form-group.half { flex: 1; }

.input-with-btn { display: flex; gap: 8px; width: 100%; }
.input-with-btn .grow { flex: 1; }
.input-with-btn :deep(.el-button) { white-space: nowrap; flex-shrink: 0; }

.test-row { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 8px; }
.test-ok { color: #07c160; font-size: 12px; }
.test-fail { color: #f56c6c; font-size: 12px; }

.install-log {
  background: #1a1a1a; color: #0f0; border-radius: 10px;
  padding: 10px 14px; width: 100%; max-height: 140px; overflow-y: auto;
  text-align: left; font-family: monospace; font-size: 12px; margin-top: 10px;
}
.log-line { padding: 1px 0; }
.done-info { margin-top: 6px; }
.done-info p { color: #333; font-size: 14px; }
.err { color: #f56c6c; font-size: 13px; margin-top: 8px; }
.key-link { color: #07c160; text-decoration: none; font-weight: 500; }
.key-link:hover { text-decoration: underline; }

/* Footer */
.wizard-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 28px 18px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
}
</style>
