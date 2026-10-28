require('express-async-errors')
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createMockRouter } = require('./mock')

/**
 * 创建并配置 Express 应用
 * @returns {Express} 配置好的 Express 应用实例
 */
function createApp() {
  const app = express()

  // ========== 中间件配置 ==========
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ limit: '10mb', extended: true }))

  // 静态文件服务
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

  // ========== 注册路由 ==========
  if (String(process.env.MOCK_BACKEND).toLowerCase() === 'true') {
    app.use('/', createMockRouter())
  } else {
    const { registerRoutes } = require('./routes')
    registerRoutes(app)
  }

  // ========== 错误处理（可选，后续扩展） ==========
  // app.use(errorHandler)

  return app
}

module.exports = { createApp }
