function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean)
  if (typeof value === 'string') {
    try { return parseTags(JSON.parse(value)) } catch (_error) { return value.split(/[,，、\s]+/).filter(Boolean) }
  }
  return []
}

function scoreSupplier(demand, supplier) {
  const reasons = []
  const breakdown = { industry: 0, scene: 0, budget: 0, period: 0 }
  if (demand.industry === supplier.industry) {
    breakdown.industry = 35
    reasons.push('所属行业一致 +35')
  }
  const demandTags = parseTags(demand.tags)
  const supplierTags = parseTags(supplier.tags)
  const normalizedScene = String(demand.scene || '') + ' ' + String(demand.description || '')
  const matchedTags = supplierTags.filter(tag => demandTags.includes(tag) || normalizedScene.includes(tag))
  if (matchedTags.length) {
    breakdown.scene = Math.round(35 * matchedTags.length / supplierTags.length)
    reasons.push(`场景标签命中 ${matchedTags.join('、')} +${breakdown.scene}`)
  } else reasons.push('场景标签未命中 +0')
  if (demand.budget_min != null && demand.budget_max != null) {
    if (supplier.budget_min != null && supplier.budget_max != null && Number(demand.budget_min) <= Number(supplier.budget_max) && Number(demand.budget_max) >= Number(supplier.budget_min)) {
      breakdown.budget = 20
      reasons.push('预算范围相容 +20')
    } else reasons.push('预算范围不相容 +0')
  } else reasons.push('需求未填写预算，此项不计分 +0')
  if (Number(supplier.period_months) <= Number(demand.period_months)) {
    breakdown.period = 10
    reasons.push('交付周期满足要求 +10')
  } else reasons.push('交付周期超出预期 +0')
  return {
    ...supplier,
    tags: supplierTags,
    score: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
    reasons
  }
}

function matchSuppliers(demand, suppliers) {
  return suppliers.map(item => scoreSupplier(demand, item))
    .filter(item => item.breakdown.industry > 0 && item.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, 3)
}

module.exports = { parseTags, scoreSupplier, matchSuppliers }
