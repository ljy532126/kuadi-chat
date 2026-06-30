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

### 1. 启动 MongoDB

```bash
docker compose up -d
```

如果本机已安装 MongoDB 可跳过。

### 2. 安装依赖

```bash
npm install
```

### 3. 启动后端（端口 3014）

```bash
npm start
```

### 4. 启动前端开发服务器（端口 5173）

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`

### 5. 生产部署

```bash
npm run build
JWT_SECRET=你的密钥 PORT=3014 npm start
```

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
