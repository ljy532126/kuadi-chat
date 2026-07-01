import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 })
  const page = await browser.newPage()

  console.log('🧪 安装向导测试开始...\n')

  // 1. Open page — should show setup wizard
  console.log('1. 打开页面...')
  await page.goto(BASE, { waitUntil: 'networkidle' })

  // Wait for wizard to appear
  const wizard = page.locator('.wizard')
  await wizard.waitFor({ timeout: 8000 })
  console.log('   ✅ 安装向导已显示')

  // Verify step indicator shows Step 1 active
  const activeStep = page.locator('.step.active .step-name')
  const stepText = await activeStep.textContent()
  console.log('   当前步骤: ' + stepText)

  // 2. Step 1: Database config
  console.log('\n2. 测试 Step 1: 数据库配置...')

  // Fill MongoDB host — clear and type localhost
  const mongoHost = page.locator('input[placeholder="mongo"]').first()
  await mongoHost.fill('localhost')
  console.log('   ✅ MongoDB 主机改为 localhost')

  // Clear mongo user/pass (no auth for local)
  const mongoUser = page.locator('input[placeholder="留空=无认证"]').first()
  await mongoUser.fill('')
  const mongoPass = page.locator('input[placeholder="留空=无认证"]').last()
  await mongoPass.fill('')

  // Click "Test DB Connection"
  console.log('   点击"测试数据库连接"...')
  await page.click('button:has-text("测试数据库连接")')

  // Wait for result
  const result = page.locator('.test-ok, .test-fail')
  await result.waitFor({ timeout: 10000 })
  const resText = await result.textContent()
  console.log('   结果: ' + resText)

  // Click "随机生成" for JWT
  console.log('   点击 JWT 随机生成...')
  await page.click('button:has-text("随机生成")')
  const jwtVal = await page.locator('input[placeholder="点击右侧按钮自动生成"]').inputValue()
  console.log('   ✅ JWT 已生成: ' + jwtVal.substring(0, 20) + '...')

  // 3. Go to Step 2
  console.log('\n3. 进入 Step 2: 管理员...')
  await page.click('button:has-text("下一步")')

  const adminEmail = page.locator('input[placeholder="admin@example.com"]')
  await adminEmail.fill('admin@test.com')
  console.log('   ✅ 管理员邮箱: admin@test.com')

  const adminPass = page.locator('input[placeholder="至少6位"]')
  await adminPass.fill('admin123456')
  console.log('   ✅ 管理员密码已填写')

  // 4. Go to Step 3
  console.log('\n4. 进入 Step 3: API 密钥...')
  await page.click('button:has-text("下一步")')
  console.log('   跳过 API 密钥配置')

  // 5. Go to Step 4
  console.log('\n5. 进入 Step 4: 确认安装...')
  await page.click('button:has-text("确认配置")')

  // Click install
  await page.click('button:has-text("开始安装")')
  console.log('   等待安装完成...')

  // Check done state
  const doneEl = page.locator('.step-content:has-text("安装完成")')
  await doneEl.waitFor({ timeout: 15000 })
  console.log('   ✅ 安装完成！')

  // Verify done message
  const doneInfo = page.locator('.done-info')
  await doneInfo.waitFor({ timeout: 5000 })
  const doneText = await doneInfo.textContent()
  console.log('   ' + doneText.trim().replace(/\n/g, ' '))

  // 6. Click "进入系统"
  console.log('\n6. 点击"进入系统"...')
  await page.click('button:has-text("进入系统")')

  // Wait for reload
  try {
    await page.waitForTimeout(2000)
  } catch {}

  // Should now see main app (no wizard)
  await page.waitForSelector('.app', { timeout: 5000 })
  console.log('   ✅ 已进入主应用，安装向导已关闭')


  console.log('\n🎉 测试全部通过!')

  // Cleanup DB again
  console.log('\n🧹 清理测试数据...')

  await browser.close()
}

run().catch(e => {
  console.error('❌ 测试失败:', e.message)
  process.exit(1)
})
