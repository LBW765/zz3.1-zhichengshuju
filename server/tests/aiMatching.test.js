const test = require('node:test')
const assert = require('node:assert/strict')
const { scoreSupplier, matchSuppliers } = require('../services/aiMatching')

const demand = { industry: '电子信息制造', scene: 'PCB 质检与视觉识别', description: '需要小样本缺陷识别', tags: ['PCB 质检', '视觉识别'], budget_min: 80, budget_max: 120, period_months: 6 }

test('规则分数由行业、标签、预算和周期构成', () => {
  const result = scoreSupplier(demand, { id: 1, industry: '电子信息制造', tags: ['PCB 质检', '视觉识别'], budget_min: 90, budget_max: 110, period_months: 6 })
  assert.equal(result.score, 100)
  assert.deepEqual(result.breakdown, { industry: 35, scene: 35, budget: 20, period: 10 })
  assert.match(result.reasons.join(' '), /预算范围相容/)
})

test('缺少预算不虚构预算分数，并按分数和 ID 稳定排序', () => {
  const withoutBudget = { ...demand, budget_min: null, budget_max: null }
  const suppliers = [3, 1, 2].map(id => ({ id, industry: '电子信息制造', tags: ['PCB 质检'], budget_min: 80, budget_max: 120, period_months: 6 }))
  const results = matchSuppliers(withoutBudget, suppliers)
  assert.deepEqual(results.map(item => item.id), [1, 2, 3])
  assert.equal(results[0].breakdown.budget, 0)
  assert.match(results[0].reasons.join(' '), /未填写预算/)
})

test('行业不符的供给不会作为推荐', () => {
  const results = matchSuppliers(demand, [{ id: 1, industry: '现代农业', tags: ['PCB 质检'], budget_min: 80, budget_max: 120, period_months: 6 }])
  assert.equal(results.length, 0)
})
