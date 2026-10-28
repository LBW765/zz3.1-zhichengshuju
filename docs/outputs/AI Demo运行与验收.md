# AI Demo 运行与验收

## 本地启动

1. 安装 `admin/` 和 `server/` 的 npm 依赖。
2. 准备本机 MySQL 或 MariaDB。AI Demo 默认连接 `127.0.0.1:3306`，库名 `jian_ai_demo`；可通过 `AI_DB_HOST`、`AI_DB_PORT`、`AI_DB_USER`、`AI_DB_PASSWORD`、`AI_DB_NAME` 覆盖。库名必须以 `_demo` 结尾。服务首次启动会创建库、表和演示数据，不读取原系统的 `DB_*` 配置。
3. 运行 `npm run dev:ai`，AI Demo API 默认监听 `127.0.0.1:3132`。
4. 运行 `npm run dev:admin`，打开 `http://127.0.0.1:8131/ai-demo`。管理端的 `/api/ai` 自动代理到 AI Demo 服务。

门户图片 `admin/public/ai-demo/jian-city.jpg` 来自本地项目材料，不进入公开仓库。异地环境应通过授权渠道单独放置该文件后再构建管理端。

演示身份账号为 `ai_enterprise`、`ai_enterprise_2`、`ai_operations`、`ai_government`。默认密码 `Demo@2026`，可在首次初始化前通过 `AI_DEMO_PASSWORD` 指定。公开门户不展示密码。

## 演示主线

1. 用企业身份登录，在供需大厅发布电子信息制造需求，填写 PCB 质检场景、预算和周期。
2. 打开需求详情和匹配结果，查看前三条方案、分数及评分原因，再进入中试验证中心提交申请。
3. 切换运营身份，在运营受理台退回申请并填写原因。
4. 切回企业身份，在“我的办理”补充说明并重新提交。
5. 用运营身份受理、开始办理并完成；用政府身份在项目台账查询同一申请及时间线。
6. 在 AI 资源、赛事、揭榜、资质和联盟页面分别检查目录、详情与申请入口。详情抽屉提供可刷新、可分享的独立详情页。

## 验证与重置

`npm --prefix server run test:ai` 包含规则测试和跨角色接口测试。接口测试要求 AI Demo 服务已启动，且连接的库名以 `_demo` 结尾；它会清理自己创建的记录。

重置只作用于独立演示库：先停止 AI Demo 服务，再设置 `AI_DEMO_RESET=1`，运行 `npm --prefix server run reset:ai-demo`，最后重新启动服务。重置会删除该库所有 AI Demo 业务记录与上传附件的数据库记录；上传文件需在本机演示环境中另行清理。不要对有现场记录需要保留的演示库执行重置。
