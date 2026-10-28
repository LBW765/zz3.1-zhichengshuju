require('dotenv').config()
const test = require('node:test')
const assert = require('node:assert/strict')
const { aiDb } = require('../db/ai')

const base = process.env.AI_TEST_BASE_URL || 'http://127.0.0.1:3132/ai'
const password = process.env.AI_DEMO_PASSWORD || 'Demo@2026'
const request = async (path, token, method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  assert.equal(response.status, 200)
  return response.json()
}
const login = async username => {
  const result = await request('/login', null, 'POST', { username, password })
  assert.equal(result.code, 200, result.message)
  return result.data.token
}

test('企业发布、匹配、中试申请、退回重提、运营办结与政府只读形成持久闭环', async () => {
  if (!aiDb.database.endsWith('_demo')) throw new Error('集成测试只能连接 _demo 库')
  const tokens = {}
  let demandId
  let applicationId
  try {
    tokens.enterprise = await login('ai_enterprise')
    tokens.other = await login('ai_enterprise_2')
    tokens.operations = await login('ai_operations')
    tokens.government = await login('ai_government')
    const denied = await request('/demands', null, 'POST', {})
    assert.equal(denied.code, 401)
    const created = await request('/demands', tokens.enterprise, 'POST', {
      title: '测试 PCB 视觉质检需求', demandType: 'AI 转型', industry: '电子信息制造', scene: 'PCB 产线视觉质检场景',
      description: '测试产线微小缺陷和小样本识别能力，验证推荐方案与中试办理闭环。', tags: ['PCB 质检', '视觉识别'],
      budgetMin: 80, budgetMax: 120, periodMonths: 6, contact: '测试联系人', phone: '13800000001'
    })
    assert.equal(created.code, 200, created.message)
    demandId = created.data.id
    const publicDetail = await request(`/demands/${demandId}`)
    assert.equal(publicDetail.data.contact, undefined)
    const ownDetail = await request(`/demands/${demandId}`, tokens.enterprise)
    assert.equal(ownDetail.data.contact, '测试联系人')
    const deniedMatch = await request(`/demands/${demandId}/matches`, tokens.other)
    assert.equal(deniedMatch.code, 403)
    const matches = await request(`/demands/${demandId}/matches`, tokens.enterprise)
    assert.equal(matches.code, 200)
    assert.ok(matches.data.items.length > 0)
    assert.equal(matches.data.items[0].breakdown.industry, 35)
    const supplierSearch = await request('/search?type=supplier&q=PCB')
    assert.ok(supplierSearch.data.items.some(item => item.category === 'supplier'))
    const supplierDetail = await request(`/suppliers/${matches.data.items[0].id}`)
    assert.equal(supplierDetail.data.id, matches.data.items[0].id)
    const pilot = await request('/catalog?category=pilot')
    const invalidEnvironment = await request('/applications', tokens.enterprise, 'POST', {
      targetType: 'pilot', targetId: pilot.data.items[0].id, demandId, supplierId: matches.data.items[0].id,
      environmentId: 999999, serviceType: '模型效果验证', contact: '测试联系人', phone: '13800000001', description: '申请验证模型在 PCB 产线场景下的识别效果。'
    })
    assert.equal(invalidEnvironment.code, 400)
    const otherIndustry = await request('/suppliers?industry=现代农业')
    const invalidSupplier = await request('/applications', tokens.enterprise, 'POST', {
      targetType: 'pilot', targetId: pilot.data.items[0].id, demandId, supplierId: otherIndustry.data.items[0].id,
      serviceType: '模型效果验证', contact: '测试联系人', phone: '13800000001', description: '申请验证模型在 PCB 产线场景下的识别效果。'
    })
    assert.equal(invalidSupplier.code, 400)
    const events = await request('/catalog?category=event')
    const unopenedEvent = events.data.items.find(item => item.status === '即将开始')
    const unopenedApplication = await request('/applications', tokens.enterprise, 'POST', {
      targetType: 'event', targetId: unopenedEvent.id, contact: '测试联系人', phone: '13800000001', description: '参加人工智能赛事活动并提交项目资料。'
    })
    assert.equal(unopenedApplication.code, 400)
    const applied = await request('/applications', tokens.enterprise, 'POST', {
      targetType: 'pilot', targetId: pilot.data.items[0].id, demandId, supplierId: matches.data.items[0].id,
      serviceType: '模型效果验证', contact: '测试联系人', phone: '13800000001', description: '申请验证模型在 PCB 产线场景下的识别效果。'
    })
    assert.equal(applied.code, 200, applied.message)
    applicationId = applied.data.id
    const operationsList = await request('/operations/applications', tokens.operations)
    assert.ok(operationsList.data.items.some(item => item.id === applicationId))
    const deniedOperationsList = await request('/operations/applications', tokens.government)
    assert.equal(deniedOperationsList.code, 403)
    const otherList = await request('/applications', tokens.other)
    assert.ok(!otherList.data.items.some(item => item.id === applicationId))
    const forbidden = await request(`/operations/applications/${applicationId}/status`, tokens.government, 'PATCH', { status: '已受理' })
    assert.equal(forbidden.code, 403)
    const noReason = await request(`/operations/applications/${applicationId}/status`, tokens.operations, 'PATCH', { status: '已退回' })
    assert.equal(noReason.code, 400)
    const returned = await request(`/operations/applications/${applicationId}/status`, tokens.operations, 'PATCH', { status: '已退回', note: '请补充产线图像样本说明。' })
    assert.equal(returned.code, 200)
    const resubmitted = await request(`/applications/${applicationId}/resubmit`, tokens.enterprise, 'PATCH', { description: '已补充产线图像样本来源与验证目标说明。' })
    assert.equal(resubmitted.code, 200)
    for (const status of ['已受理', '处理中', '已完成']) {
      const changed = await request(`/operations/applications/${applicationId}/status`, tokens.operations, 'PATCH', { status, note: '演示流程验证' })
      assert.equal(changed.code, 200, changed.message)
    }
    const govDetail = await request(`/applications/${applicationId}`, tokens.government)
    assert.equal(govDetail.data.status, '已完成')
    assert.equal(govDetail.data.contact, undefined)
    assert.equal(govDetail.data.events.length, 6)
    const projects = await request('/government/projects?status=已完成', tokens.government)
    assert.ok(projects.data.items.some(item => item.id === applicationId))
    const govWrite = await request(`/applications/${applicationId}/resubmit`, tokens.government, 'PATCH', { description: '不应允许政府修改记录' })
    assert.equal(govWrite.code, 403)
  } finally {
    if (applicationId) {
      await aiDb.run('DELETE FROM ai_application_events WHERE application_id=?', [applicationId])
      await aiDb.run('DELETE FROM ai_applications WHERE id=?', [applicationId])
    }
    if (demandId) await aiDb.run('DELETE FROM ai_demands WHERE id=?', [demandId])
    for (const token of Object.values(tokens)) await request('/logout', token, 'POST')
    await aiDb.pool.end()
  }
})
