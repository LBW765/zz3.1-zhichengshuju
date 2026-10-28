const bcrypt = require('bcryptjs')
const { aiDb } = require('./ai')

const demoUsers = [
  ['ai_enterprise', '企业演示账号', '吉安电子制造企业', 'enterprise'],
  ['ai_enterprise_2', '企业演示账号二', '吉安果业企业', 'enterprise'],
  ['ai_operations', '运营演示账号', '吉安新庐陵智城数据运营管理有限公司', 'operations'],
  ['ai_government', '政府演示账号', '吉安市产业服务部门', 'government']
]

const demands = [
  ['PCB 产线 AI 视觉质检与小样本缺陷识别', 'AI 转型', '电子信息制造', '工业质检', '针对 PCB 产线微小缺陷，建设可适配多品类产品的智能视觉质检能力。', ['PCB 质检', '视觉识别', '小样本'], 80, 120, 6, '井冈山经开区', '2026-12-15'],
  ['井冈蜜柚果园智能监测与病虫害预警', 'AI 转型', '现代农业', '智慧农业', '汇集果园环境与图像数据，支持病虫害识别、长势分析与农事提醒。', ['病虫害识别', '农情监测'], 30, 50, 6, '吉安县', '2027-01-08'],
  ['井冈山景区 AI 数字人讲解服务', '技术攻关', '文旅服务', '红色文旅', '面向游客提供多语言互动讲解、路线推荐与红色文化知识问答。', ['数字人', '知识问答'], 100, 200, 12, '井冈山市', '2027-01-20'],
  ['12345 热线智能坐席辅助', 'AI 转型', '政务治理', '政务服务', '支持诉求分类、知识检索与答复建议，提升热线处理效率。', ['智能客服', '知识检索'], 200, 300, 12, '吉安市本级', '2027-02-12']
]

const suppliers = [
  ['工业视觉质检方案', '演示工业视觉服务团队', '电子信息制造', '支持 PCB 微小缺陷识别、小样本训练和边缘部署。', ['PCB 质检', '视觉识别', '小样本'], 80, 120, 6],
  ['产线缺陷识别平台', '演示智能制造服务团队', '电子信息制造', '支持产线视觉识别、设备接入和模型调优。', ['视觉识别', '产线部署'], 60, 150, 8],
  ['产业联盟联合验证方案', '演示本地联合服务团队', '电子信息制造', '提供本地场景对接、中试验证与定制开发。', ['中试验证', '定制开发'], 50, 130, 10],
  ['果园 AI 种植决策方案', '演示智慧农业服务团队', '现代农业', '提供病虫害识别和农情监测能力。', ['病虫害识别', '农情监测'], 20, 60, 6],
  ['文旅数字人互动方案', '演示文旅技术服务团队', '文旅服务', '提供数字人讲解、路线推荐和知识问答。', ['数字人', '知识问答'], 80, 220, 12]
]

const catalog = [
  ['compute', 'A100 GPU 算力卡', '训练算力', 'NVIDIA A100 80G，按小时申请。', '演示算力服务中心', '电子信息制造', null, '可申请', { specification: '80G', billing: '按小时申请' }],
  ['compute', '昇腾 910B NPU', '国产算力', '昇腾 910B 64G，支持国产模型适配。', '演示算力服务中心', '政务治理', null, '可申请', { specification: '64G', billing: '按小时申请' }],
  ['compute', 'AI 训练集群 8 卡', '集群算力', '8 卡训练环境及高速网络。', '演示算力服务中心', '电子信息制造', null, '可申请', { specification: '8 卡', billing: '项目制申请' }],
  ['model', '庐陵政务问答模型', '行业模型', '政策问答、公文辅助和方言服务的方案示例。', '演示模型服务团队', '政务治理', null, '可申请', {}],
  ['model', '工业视觉模型', '场景模型', '电子元件与 PCB 缺陷识别的方案示例。', '演示模型服务团队', '电子信息制造', null, '可申请', {}],
  ['model', '农业病虫害识别模型', '场景模型', '面向井冈蜜柚等作物图像识别的方案示例。', '演示模型服务团队', '现代农业', null, '可申请', {}],
  ['model', '赣方言语音识别模型', '行业模型', '本地方言语音转写与理解的方案示例。', '演示模型服务团队', '政务治理', null, '测试阶段', {}],
  ['data', '吉安政务问答数据集', '文本', '政策事项与常见问答语料示例。', '演示数据服务团队', '政务治理', null, '授权申请', {}],
  ['data', '电子元件装配图像集', '图像', '面向视觉质检的多类别图像示例。', '演示数据服务团队', '电子信息制造', null, '授权申请', {}],
  ['data', '井冈蜜柚病虫害图集', '图像', '果树病虫害与生长阶段图像示例。', '演示数据服务团队', '现代农业', null, '可申请', {}],
  ['data', '赣方言语料库', '语音', '吉安地域方言语音资料示例。', '演示数据服务团队', '政务治理', null, '授权申请', {}],
  ['agent', '政务政策问答助手', '政务服务', '政策知识检索与答复建议示例。', '演示智能体服务团队', '政务治理', null, '可申请', {}],
  ['agent', '企业 AI 诊断助手', '产业服务', '采集企业需求并推荐适配方案。', '演示智能体服务团队', '电子信息制造', null, '可申请', {}],
  ['agent', '蜜柚种植巡检助手', '现代农业', '识别图像并生成农事建议示例。', '演示智能体服务团队', '现代农业', null, '示例应用', {}],
  ['pilot', '模型效果验证', '中试服务', '准确率、稳定性和鲁棒性等指标测试。', '吉安新庐陵智城数据运营管理有限公司', '电子信息制造', null, '可申请', { materials: ['场景说明', '模型说明'] }],
  ['pilot', '安全合规评测', '中试服务', '算法安全、数据安全与应用合规评估。', '吉安新庐陵智城数据运营管理有限公司', '政务治理', null, '可申请', { materials: ['产品说明', '数据说明'] }],
  ['pilot', '场景适配调试', '中试服务', '模型压缩、边缘部署与设备对接。', '吉安新庐陵智城数据运营管理有限公司', '电子信息制造', null, '可申请', { materials: ['适配需求'] }],
  ['environment', '电子制造中试线', '测试环境', 'SMT、AI 视觉及产线测试环境。', '吉安新庐陵智城数据运营管理有限公司', '电子信息制造', null, '可预约', {}],
  ['environment', '智慧农业中试场', '测试环境', '传感器、无人机与农情监测环境。', '吉安新庐陵智城数据运营管理有限公司', '现代农业', null, '可预约', {}],
  ['environment', '智能网联测试场', '测试环境', '城市道路模拟与车路协同环境。', '吉安新庐陵智城数据运营管理有限公司', '政务治理', null, '可预约', {}],
  ['event', '吉安市 AI 创新创业大赛', '创新创业', '面向重点产业征集创新项目。', '演示赛事组委会', '', '2026-12-18', '报名中', { materials: ['项目简介', '团队信息'] }],
  ['event', '工业 AI 视觉质检算法挑战赛', '行业挑战', '聚焦电子元件与 PCB 缺陷识别。', '演示赛事组委会', '电子信息制造', '2027-01-15', '报名中', { materials: ['技术方案'] }],
  ['event', '赣方言 AI 语音识别大赛', '技术竞赛', '推动本地方言语音技术研发与应用。', '演示赛事组委会', '政务治理', '2027-02-08', '即将开始', { materials: ['项目简介'] }],
  ['task', '面向赣方言的多模态政务模型关键技术研究', '重点攻关', '公开征集关键技术攻关方案。', '吉安市大数据中心', '政务治理', '2027-01-20', '征集中', { materials: ['申报书', '团队资质'], reward: '以正式榜单公告为准', period: '2027 年一季度' }],
  ['task', '电子信息产业小样本 AI 视觉质检技术攻关', '工业 AI', '聚焦小样本缺陷识别与产线适配。', '演示场景发布单位', '电子信息制造', '2027-02-15', '征集中', { materials: ['申报书'], reward: '以正式榜单公告为准', period: '2027 年上半年' }],
  ['task', '井冈蜜柚全产业链 AI 决策与示范应用', '智慧农业', '围绕农情监测与决策开展场景攻关。', '演示场景发布单位', '现代农业', '2027-03-10', '征集中', { materials: ['申报书'], reward: '以正式榜单公告为准', period: '2027 年上半年' }],
  ['qualification', '人工智能企业认定', '资质认定', '政策咨询、材料指导、线上申报与进度跟踪。', '吉安新庐陵智城数据运营管理有限公司', '', null, '可申请', { materials: ['营业执照', '企业简介'], process: ['提交材料', '运营受理', '认定反馈'] }],
  ['qualification', 'AI 产品检测与评测', '技术评测', '功能、性能、精度、安全与适配性评估。', '吉安新庐陵智城数据运营管理有限公司', '', null, '可申请', { materials: ['产品说明', '测试方案'], process: ['提交申请', '需求评估', '检测反馈'] }],
  ['qualification', '人工智能科技伦理审查', '合规服务', '风险排查、伦理审查与合规指导。', '吉安新庐陵智城数据运营管理有限公司', '', null, '可申请', { materials: ['场景说明', '数据说明'], process: ['提交申请', '风险排查', '审查反馈'] }],
  ['alliance', '吉安市人工智能产业联盟', '联盟入会', '汇聚企业、高校和服务商，推动资源共享与场景共创。', '吉安新庐陵智城数据运营管理有限公司', '', null, '开放申请', { materials: ['单位简介', '入会申请表'] }],
  ['alliance_member', '电子信息产业创新服务组', '联盟成员', '工业视觉与智能制造协同服务。', '演示联盟成员', '电子信息制造', null, '展示中', {}],
  ['alliance_member', '智慧农业应用协同组', '联盟成员', '农业模型与场景验证协同服务。', '演示联盟成员', '现代农业', null, '展示中', {}],
  ['alliance_member', '产学研联合创新组', '联盟成员', '科研成果与人才培育协同服务。', '演示联盟成员', '', null, '展示中', {}],
  ['policy', '吉安市加快人工智能产业高质量发展若干措施', '政策资讯', '人工智能产业发展政策资讯示例。', '演示政策发布单位', '', null, '公开', {}],
  ['news', '人工智能产业联盟首批成员单位招募', '平台动态', '产业联盟首批成员单位招募动态。', '吉安新庐陵智城数据运营管理有限公司', '', null, '公开', {}],
  ['news', '电子信息产业 AI 视觉质检场景开放', '行业资讯', '电子信息产业视觉质检场景开放动态。', '吉安新庐陵智城数据运营管理有限公司', '电子信息制造', null, '公开', {}]
]

const metrics = [
  ['compute', '智能总算力', 1280, 'P', '算力资源汇聚'],
  ['institutions', '入驻 AI 机构', 386, '家', '多方生态协同'],
  ['published_demands', '发布企业需求', 380, '个', '场景持续开放'],
  ['matching', '供需匹配度', 95, '%', '方案演示指标'],
  ['companies', 'AI 企业单位数', 186, '家', '本月新增 12 家'],
  ['output', 'AI 产业产值', 128.5, '亿元', '同比增长 32.6%'],
  ['projects', '在建项目', 92, '个', '重点项目持续推进'],
  ['algorithms', '合规备案算法', 64, '项', '本月新增 8 项']
]

async function seedAi() {
  const password = bcrypt.hashSync(process.env.AI_DEMO_PASSWORD || 'Demo@2026', 10)
  for (const [username, displayName, company, role] of demoUsers) {
    await aiDb.run('INSERT IGNORE INTO ai_users (username,password,display_name,company,role) VALUES (?,?,?,?,?)', [username, password, displayName, company, role])
  }
  const enterprise = await aiDb.get('SELECT id,company FROM ai_users WHERE username=?', ['ai_enterprise'])
  if (!(await aiDb.get('SELECT id FROM ai_demands LIMIT 1'))) {
    for (const [title, type, industry, scene, description, tags, min, max, months, region, deadline] of demands) {
      const result = await aiDb.run('INSERT INTO ai_demands (title,demand_type,industry,scene,description,tags,budget_min,budget_max,period_months,region,deadline,company,contact,phone,seed_record,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)', [title, type, industry, scene, description, JSON.stringify(tags), min, max, months, region, deadline, enterprise.company, '演示联系人', '13800000000', enterprise.id])
      await aiDb.run('UPDATE ai_demands SET demand_no=? WHERE id=?', [`JA-${new Date().getFullYear()}-${String(result.insertId).padStart(6, '0')}`, result.insertId])
    }
  }
  if (!(await aiDb.get('SELECT id FROM ai_suppliers LIMIT 1'))) {
    for (const [title, provider, industry, description, tags, min, max, months] of suppliers) {
      await aiDb.run('INSERT INTO ai_suppliers (title,provider,industry,description,tags,budget_min,budget_max,period_months,seed_record) VALUES (?,?,?,?,?,?,?,?,1)', [title, provider, industry, description, JSON.stringify(tags), min, max, months])
    }
  }
  if (!(await aiDb.get('SELECT id FROM ai_catalog_items LIMIT 1'))) {
    for (const [category, title, subtype, summary, provider, industry, deadline, status, metadata] of catalog) {
      await aiDb.run('INSERT INTO ai_catalog_items (category,title,subtype,summary,body,provider,industry,deadline,status,metadata,seed_record) VALUES (?,?,?,?,?,?,?,?,?,?,1)', [category, title, subtype, summary, summary, provider, industry, deadline, status, JSON.stringify(metadata)])
    }
  }
  for (const [key, label, value, unit, note] of metrics) {
    await aiDb.run('INSERT IGNORE INTO ai_metrics (metric_key,label,value,unit,note,kind) VALUES (?,?,?,?,?,?)', [key, label, value, unit, note, 'demo'])
  }
  if (!(await aiDb.get('SELECT id FROM ai_applications LIMIT 1'))) {
    const operator = await aiDb.get('SELECT id,display_name FROM ai_users WHERE username=?', ['ai_operations'])
    const demand = await aiDb.get('SELECT id FROM ai_demands ORDER BY id LIMIT 1')
    const supplier = await aiDb.get('SELECT id FROM ai_suppliers ORDER BY id LIMIT 1')
    const samples = [
      ['PCB 产线视觉模型效果验证', 'pilot', '处理中', '中试验证'],
      ['工业视觉模型资源申请', 'resource', '待受理', '模型资源'],
      ['人工智能企业认定申请', 'qualification', '已完成', '资质认定'],
      ['井冈蜜柚场景资料补充', 'pilot', '已退回', '中试验证']
    ]
    for (const [title, targetType, status, type] of samples) {
      const result = await aiDb.run('INSERT INTO ai_applications (application_type,target_type,demand_id,supplier_id,title,company,contact,phone,description,service_type,status,return_reason,seed_record,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)', [type, targetType, demand.id, targetType === 'pilot' ? supplier.id : null, title, enterprise.company, '演示联系人', '13800000000', '用于界面和跨角色流程演示的申请记录。', type, status, status === '已退回' ? '请补充场景说明。' : '', enterprise.id])
      await aiDb.run('UPDATE ai_applications SET application_no=? WHERE id=?', [`AP-${new Date().getFullYear()}-${String(result.insertId).padStart(6, '0')}`, result.insertId])
      await aiDb.run('INSERT INTO ai_application_events (application_id,from_status,to_status,actor_id,actor_name,note,created_by) VALUES (?,?,?,?,?,?,?)', [result.insertId, '', '待受理', enterprise.id, '企业演示账号', '提交申请', enterprise.id])
      if (status !== '待受理') {
        const steps = status === '处理中' || status === '已完成' ? ['已受理', '处理中', ...(status === '已完成' ? ['已完成'] : [])] : ['已退回']
        let previous = '待受理'
        for (const step of steps) {
          await aiDb.run('INSERT INTO ai_application_events (application_id,from_status,to_status,actor_id,actor_name,note,created_by) VALUES (?,?,?,?,?,?,?)', [result.insertId, previous, step, operator.id, operator.display_name, step === '已退回' ? '请补充场景说明。' : '演示办理记录', operator.id])
          previous = step
        }
      }
    }
  }
}

module.exports = seedAi
