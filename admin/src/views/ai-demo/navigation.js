export const basePath = '/ai-demo'

export const navigation = [
  { key: 'home', label: '首页', icon: 'House', path: basePath, items: [{ label: '平台首页', path: basePath }, { label: '综合检索', path: `${basePath}/search` }] },
  { key: 'service', label: '产业服务', icon: 'Connection', path: `${basePath}/services/demands`, items: [{ label: '供需大厅', path: `${basePath}/services/demands` }, { label: '中试验证', path: `${basePath}/services/pilot` }, { label: '资质与评测', path: `${basePath}/services/qualification` }] },
  { key: 'ai', label: 'AI 服务', icon: 'Cpu', path: `${basePath}/ai/resources`, items: [{ label: 'AI 服务中心', path: `${basePath}/ai/resources` }] },
  { key: 'ecosystem', label: '产业生态', icon: 'Opportunity', path: `${basePath}/ecosystem/events`, items: [{ label: '赛事活动', path: `${basePath}/ecosystem/events` }, { label: '揭榜挂帅', path: `${basePath}/ecosystem/tasks` }, { label: '产业联盟', path: `${basePath}/ecosystem/alliance` }] },
  { key: 'workspace', label: '工作台', icon: 'Grid', path: `${basePath}/enterprise/workbench`, items: [{ label: '企业工作台', path: `${basePath}/enterprise/workbench` }, { label: '我的办理', path: `${basePath}/enterprise/applications` }, { label: '运营受理', path: `${basePath}/operations/applications` }, { label: '政府总览', path: `${basePath}/government/overview` }, { label: '项目台账', path: `${basePath}/government/projects` }] }
]
