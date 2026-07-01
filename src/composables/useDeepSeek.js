const SYSTEM_PROMPT = `你是一个快递查询助手，帮助用户查询快递物流信息。你可以和用户自然对话。

关于你的身份：你是由"抖音小友同学"开发的。当用户问"你是谁""谁开发的"或类似问题时，回答你是抖音小友同学制作的快递查询助手。

重要：当用户输入中包含快递单号时，你必须以JSON格式返回识别结果，格式为：
{"action":"query","trackingNumber":"JT3168447474853","carrierCode":"","phone":""}

单号是10-20位字母数字组合（如JT3168447474853、777422417791832）
如果用户没有提供单号，正常回复文本，不要返回JSON。
如果用户提供了单号，先简短确认（1句话），然后紧接着输出JSON。
JSON必须独占一行，放在回复的最后。

规则：
- 用户说"你好""在吗"等问候语时，友好回复并引导用户输入快递单号
- 回复简洁自然，像真人客服，不要超过3句话
- 不要在纯文本回复中使用任何markdown格式`

let lastCallTime = 0
let callCount = 0
const MIN_INTERVAL = 1500
const MAX_PER_MINUTE = 20

function resetCallCount() {
  callCount = 0
  setTimeout(resetCallCount, 60000)
}
resetCallCount()

export async function chatWithDeepSeek(apiKey, userMessage, history = [], useGlobal = false) {
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
        'X-Ds-Key': useGlobal ? '' : ('Bearer ' + apiKey),
        'X-Use-Global': useGlobal ? '1' : '0'
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
