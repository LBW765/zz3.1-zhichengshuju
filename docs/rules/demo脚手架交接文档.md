# 精益运维演示系统交接文档

## 当前定位

本仓库已由系统脚手架改造为“精益运维管理系统”单租户 Web 投标演示。默认 profile 为 `lean-ops`，旧业务代码仅作兼容留存，不在默认运行图中。

## 交付范围

- Web 管理端与 Express API
- 独立 `lean_ops_demo` MySQL 库
- 真实 Ping、ZStack 标准 Action API 适配、SNMP 轮询/Trap、演示指标和采集日志
- 资产（含 SN、保修、CSV 导入导出与回收恢复）、IPAM 内资产发现、告警、二维拓扑内机柜 U 位（单建/编辑/删除、批量建柜、参考图、拖拽上架与跨柜移动）、配线预检导入、巡检 PDF、报表、知识、流程、双版大屏、AI、菜单/按钮/设备/字段权限与日志
- 多网卡和采集网络绑定，Ping、SNMP、Redfish 与 ZStack 可选源地址，未配置时使用系统路由
- 原创 CSS 云节点品牌标识，不使用无法核实的官方 Logo

不包含移动端、3D 数字孪生、现场 SNMP/IPMI/Redfish/ZStack 联调实施和商务资质材料；代码已提供 SNMP/ZStack 适配器，现场接入仍需客户凭据与接口文档。

## 关键目录

- `server/leanOps.js`：默认后端入口
- `server/routes/leanOps/`：认证、系统与 `/ops/*` 路由
- `server/db/leanOpsSchema.js`：独立运维结构
- `server/db/seedLeanOps.js`：幂等演示数据
- `server/services/opsCollector.js`：Ping 与演示指标采集
- `server/services/zstackAdapter.js`：ZStack 登录、同步、开关机和开通适配
- `server/services/snmpAdapter.js`：SNMP 轮询、配置脱敏和 Trap 入库
- `server/services/assetDiscovery.js`：IP 范围校验、并发真实 Ping 和发现结果入库
- `server/services/networkBindings.js`：采集网络、资产网卡和协议源地址解析
- `server/services/fieldPermissions.js`：通用字段读取、写入和导出权限强制执行
- `server/routes/leanOps/p0.js`：资产发现、部件、接口、ZStack 主机、机柜档案/布局/上架、拓扑图片和排行接口
- `server/workers/snmpTrapReceiver.js`：独立 Trap UDP 接收进程
- `admin/src/views/ops/`：五个业务入口
- `admin/src/views/ops/analysis/components/OpsScreen.vue`：综合运维与云平台双版大屏
- `docs/stories/business/ops/`：S01-S22 模块方案
- `docs/original/`：原始需求、会议记录和参考图
- `docs/outputs/`：正式输出物
- `docs/screenshots/`：验收与投标截图
- `docs/updates/`：统一项目更新记录

## 初始化与启动

Windows 可双击根目录 `一键启动.bat`，MySQL 检查、Express 和 Vite 共用一个终端窗口，默认不启动 `app/`；脚本读取 `server/.env` 的 `PORT` 并同步 Vite 代理，关闭该窗口即可停止本次前后端进程。

```bash
npm run seed:ops-demo
npm run dev:server
npm run dev:admin
npm run collector:ops
npm run trap:ops
```

默认端口为后端 `3131`、admin `8131`。数据库名由 `OPS_DB_NAME` 指定，默认 `lean_ops_demo`。

## 验证

```bash
npm run test:ops
node scripts/verifyLeanOps.cjs http://localhost:8131
```

后端验收共 20 项，覆盖表边界、种子幂等、规划图二级菜单、SN/保修、设备部件、多网卡采集绑定、P0 演示数据、菜单/按钮/设备/字段权限、ZStack 开关/开通/删除、SNMP Trap、IP 冲突、密钥脱敏、公司模型和流程承接/审批生命周期。浏览器验收覆盖登录、工作台、资源监控、协同、分析、系统管理和两套大屏。

最终验收截图与报告位于 `docs/screenshots/final/`；三级功能清单和内部评审报价位于 `docs/outputs/`。

## 注意事项

- `server/.env` 不提交，`OPS_SECRET_KEY` 上线后不可随意更换。
- 演示发送、演示指标和 AI 回退结果必须保留来源标识。
- ZStack 现场联调前需取得客户接口文档，确认版本、认证、API 路径、异步结果和字段映射。
- 短信、电话和公众号配置入口已停用；站内、邮件、Webhook、飞书和企业微信为当前演示渠道。
- 新增写接口必须调用 `writeOperationLog`。
- 新增资产相关查询必须调用 `getAccessibleAssetFilter`。
- 机柜参考图不进入识别流程；上架接口由服务端校验 U 位范围与重叠，资产位置以 `ops_assets.cabinet_id` 为主、旧 `rack_name` 为兼容字段。
- 旧业务需要显式 `APP_PROFILE=legacy`，不得混入默认运维菜单或 schema。
