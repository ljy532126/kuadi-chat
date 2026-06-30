# 📦 快递查询助手

聊天式快递物流查询应用，支持 AI 智能对话、自动识别单号、导出分享。

## 技术栈

**前端** Vue 3 + Vite + Element Plus + Heroicons  
**后端** Express + MongoDB + JWT  
**AI** DeepSeek 大模型  
**快递接口** UAPI  

## 功能

- 🤖 DeepSeek AI 智能对话，自动识别快递单号
- 📦 支持中通、圆通、韵达、申通、极兔、顺丰、京东、EMS、德邦等
- 📋 剪切板自动识别单号，一键发送
- 🖼 查询结果导出精美卡片图片 / 复制到剪贴板
- 👤 注册登录，登录后无限查询
- 📊 数据统计（访问量、查询次数、快递公司分布）
- 🛡️ bcrypt 密码加密、JWT 鉴权、防暴力破解、防时序攻击
- 🎨 自定义头像、右侧抽屉设置

## 快速开始

### 一键部署（Docker）

```bash
docker compose up -d --build
```

### 安装向导

首次启动后访问 `http://你的IP:3014`，自动进入安装向导：

1. **数据库** — 填写 MongoDB 连接地址和 JWT 密钥
2. **管理员** — 创建管理员邮箱和密码
3. **API 密钥** — 可选，配置全局 UAPI/DeepSeek 密钥
4. **安装** — 点击开始安装，自动完成初始化

安装完成后自动登录，即可开始使用。

### 开发模式

```bash
# 终端 1: Express 后端
npm start

# 终端 2: Vite 前端
npm run dev
```

浏览器打开 `http://localhost:5173`

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 服务端口 | 3014 |
| `MONGO_URI` | MongoDB 连接 | mongodb://localhost:27017/tracking |
| `JWT_SECRET` | JWT 签名密钥 | 生产环境务必修改 |
| `CORS_ORIGIN` | 允许的跨域域名 | * (开发环境) |

## 目录结构

```
├── index.html              # Vite 入口
├── vite.config.js          # Vite 配置 + dev proxy
├── server/
│   ├── index.js            # Express 入口
│   ├── middleware/
│   │   ├── auth.js         # JWT 鉴权
│   │   └── rateLimit.js    # 免费次数限制
│   ├── models/
│   │   ├── User.js         # 用户模型
│   │   └── Stat.js         # 统计数据模型
│   └── routes/
│       ├── auth.js         # 注册/登录
│       ├── proxy.js        # UAPI + DeepSeek 代理
│       └── stats.js        # 统计接口
├── src/
│   ├── App.vue             # 根组件
│   ├── components/         # Vue 组件 (13个)
│   ├── composables/        # 组合式函数 (7个)
│   └── utils/              # 工具函数
└── docker-compose.yml      # MongoDB 容器
```
