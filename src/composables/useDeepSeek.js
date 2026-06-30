const SYSTEM_PROMPT = `你是一个快递查询助手，帮助用户查询快递物流信息。你可以和用户自然对话。

关于你的身份：你是由"抖音小友同学"开发的。当用户问"你是谁""谁开发的"或类似问题时，回答你是抖音小友同学制作的快递查询助手。

你的能力：
1. 从用户输入中识别快递单号（通常10-20位字母数字组合）
2. 识别承运商代码（如 zhongtong、yuantong、yunda、shentong、jitu、shunfeng、jd、ems、debang 等）
3. 识别4位手机尾号

如果用户查询次数用完，提示他们注册登录获取更多次数。

规则：
- 用户说"你好""在吗"等问候语时，友好回复并引导用户输入快递单号
- 用户问"怎么用""帮助"时，给出简洁的使用说明
- 用户输入包含快递单号时，确认你要帮他查询，回复简短友好
- 如果用户输入的内容看起来不像快递单号（太短或全是中文），友好提示正确格式
- 如果系统提示今日免费次数已用完，引导用户注册登录
- 回复简洁自然，像真人客服，不要超过3句话
- 不要用markdown格式，纯文本回复`

let lastCallTime = 0
let callCount = 0
const MIN_INTERVAL = 1500
const MAX_PER_MINUTE = 20

function resetCallCount() {
  callCount = 0
  setTimeout(resetCallCount, 60000)
}
resetCallCount()

export async function chatWithDeepSeek(apiKey, userMessage, history = []) {
  const now = Date.now()
  const elapsed = now - lastCallTime

  if (elapsed < MIN_INTERVAL) {
    return { error: true, message: '发送太快，请等待 ' + Math.ceil((MIN_INTERVAL - elapsed) / 1000) + ' 秒。' }
  }

  if (callCount >= MAX_PER_MINUTE) {
    return { error: true, message: '请求太频繁，请稍等片刻。' }
  }

  lastCallTime = now
  callCount++

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6),
    { role: 'user', content: userMessage }
  ]

  let response
  try {
    response = await fetch('/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ds-Key': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    })
  } catch {
    callCount = Math.max(0, callCount - 1)
    return { error: true, message: 'DeepSeek 连接失败，请检查网络。' }
  }

  if (!response.ok) {
    callCount = Math.max(0, callCount - 1)
    let msg = '请求失败'
    try {
      const body = await response.json()
      if (response.status === 401) msg = 'DeepSeek 密钥无效'
      else if (response.status === 402) msg = 'DeepSeek 余额不足'
      else msg = body.error?.message || msg
    } catch {}
    return { error: true, message: msg }
  }

  let data = {}
  try { data = await response.json() } catch {}
  return { error: false, content: data.choices?.[0]?.message?.content || '' }
}
