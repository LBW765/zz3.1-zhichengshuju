# 项目规范

## 当前定位

本项目的原有管理端和移动端为系统脚手架。吉安市人工智能创新应用综合服务平台 Demo 在 `ai-demo` 路由和独立 AI 服务中实现；其他旧业务域文件不作为本 Demo 的数据源。

开发前优先阅读：

- `docs/rules/开发规范.md`
- `docs/rules/首次使用指南.md`
- `docs/rules/demo脚手架交接文档.md`

## 技术栈

- admin：Vue 3 + Vite 5 + Vue Router 4 + Pinia + Element Plus
- app：uni-app + Vue 3 + Pinia + Vite
- server：Express + MySQL
- 密码加密：bcryptjs

## 仓库结构

- `admin/`：后台管理端
- `app/`：移动端 uni-app
- `server/`：后端服务
- `docs/`：项目文档
- `standards/`：通用规范

## 启动方式

- 后台前端：`npm run dev:admin`，端口 `8131`
- 移动端：`npm run dev:app`
- 后端：`npm run dev:server`，端口 `3131`
- admin 通过 Vite proxy 将 `/api` 转发到后端，并剥离 `/api` 前缀
- 访问 `http://127.0.0.1:8131/` 登录后默认进入 AI Demo 入口 `/ai-demo`
- 依赖安装：分别在 `admin/`、`app/`、`server/` 执行 `npm install`

## 数据库

- 原系统使用 MySQL，连接配置来自 `server/.env`；AI Demo 默认使用内存 Mock 数据，不要求本机安装数据库
- `server/.env` 不提交
- 首次连接空库时，后端会执行 `server/db/schema.sql` 创建基础表，并执行 `server/db/seed.js` 初始化账号和基础菜单
- 原系统 schema 包含系统基础表和编码规则表；AI Demo 默认由 `server/db/aiMock.js` 提供内存数据，设置 `AI_MOCK=false` 后才使用 `server/db/aiSchema.sql` 和独立 `_demo` MySQL 库

## 预设账号

- `administrator / 123456`
- `admin / 123456`
- `user / 123456`

## 当前保留模块

### admin 页面

- `ai-demo/*`：人工智能创新应用综合服务平台 Demo，包含公开门户、企业、运营和政府工作台；业务数据来自独立 AI Demo 服务
- `login`
- `dashboard`
- `profile`
- `system/user`
- `system/role`
- `system/department`
- `system/menu`
- `system/platform`
- `code-rule/list`
- `error`
- `coming-soon`

### 后端路由

| 模块 | 路径 | 前端 API |
| --- | --- | --- |
| 认证 | `/login`、`/logout`、`/user/info`、`/user/profile`、`/user/password` | `admin/src/api/user.js` |
| 用户管理 | `/system/users` | `admin/src/api/user.js` |
| 角色管理 | `/system/roles` | `admin/src/api/role.js` |
| 部门管理 | `/system/departments` | `admin/src/api/department.js` |
| 权限管理 | `/system/permissions`、`/permissions` | `admin/src/api/permission.js` |
| 菜单管理 | `/menus`、`/menus/accessible` | `admin/src/api/menu.js` |
| 仪表盘 | `/dashboard/stats`、`/dashboard/system-stats`、`/dashboard/login-records`、`/dashboard/widgets` | `admin/src/api/dashboard.js` |
| 平台配置 | `/system/platform/config` | `admin/src/api/system.js` |
| 文件上传 | `/system/upload` | `admin/src/api/system.js` |
| 编码规则 | `/code-rule`、`/code-rule/preview`、`/code-rule/next-code` | `admin/src/api/codeRule.js` |
| AI Demo | `/ai/*`，独立服务端口 `3132` | `admin/src/api/aiDemo.js` |

AI Demo 服务使用 `npm run dev:ai` 启动，默认运行内存 Mock 模式并在重启时恢复种子数据；设置 `AI_MOCK=false` 后才读取 `AI_DB_*` 数据库连接配置，库名必须以 `_demo` 结尾。管理端 `/api/ai` 代理到该服务，业务页面位于 `admin/src/views/ai-demo/`。详细功能和验收见 `docs/outputs/吉安市人工智能创新应用综合服务平台Demo开发文档.md`。

### app 页面

- `pages/login/index`
- `pages/home/index`
- `pages/mine/index`
- `pages/profile/index`
- `pages/change-password/index`
- `pages/theme/index`

## 接口规范

- AI Demo 页面走独立 Express 后端；其默认数据源是服务内存 Mock，业务页面不在前端写静态 Mock API
- 前端 API URL 不带 `/api` 前缀
- 后端路由路径不带 `/api` 前缀
- 响应格式：`{ code: 200, message: '', data: {} }`
- 认证通过 `Authorization: Bearer <token>` header 传递

## 新增后端接口

1. 在 `server/routes/` 新增或修改路由文件
2. 在 `server/routes/index.js` 注册路由
3. 在 `admin/src/api/` 封装请求函数
4. 如需新表，在 `server/db/schema.sql` 增加 MySQL 建表 SQL

业务表基础字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INT AUTO_INCREMENT PRIMARY KEY | 主键 |
| `created_by` | INT | 创建人 |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | 更新时间 |

有业务编号时：

- 字段命名使用 `xxx_no`
- 建唯一约束
- 优先接入 `server/services/codeGenerator.js`

## 前端页面规范

- 页面根容器使用 `page-shell`
- 列表页结构：`PageHeader` → `page-toolbar` → `table-shell` → 分页
- 表格使用 `:fit="false"`
- 操作列固定右侧，使用 `table-actions`
- 弹窗使用 Element Plus 默认 header，不自定义 `#header`
- 页面颜色使用 CSS/SCSS 变量，不硬编码主题色
- 新页面只需放在 `admin/src/views/` 下，并通过菜单管理配置动态路由

## app 规范

- 新增页面必须同步维护 `app/src/pages.json`
- tabBar 页面使用 `uni.switchTab`
- 非 tabBar 页面使用 `uni.navigateTo`
- 页面根节点使用 `app-page`
- tabBar 页面根节点加 `app-page--tabbar`
- 颜色使用 `app/src/styles/variables.scss` 中的变量

## 删除边界

以下内容已删除，不要在新开发中恢复，除非用户明确要求：

- demo-order
- `_templates`
- 前端 `MOCK` 开关模板
- HR、财务、供应链、产品营销、生产、设备、安全、客户等业务域
- MES mock
- 财务 mock 工单
- 推送/部署脚本

## 文档同步

完成代码修改后必须检查本文件是否需要同步更新。涉及以下变化时必须更新：

- 公共组件新增或删除
- 接口路径变化
- 目录结构调整
- 页面规范变化
- 启动方式变化
- 数据库初始化方式变化
