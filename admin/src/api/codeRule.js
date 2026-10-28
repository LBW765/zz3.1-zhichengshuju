import request from '@/utils/request'

// 列表（分页 + 搜索）
export function getCodeRuleList(params) {
  return request({
    url: '/code-rule',
    method: 'get',
    params
  })
}

// 详情（含完整字段配置）
export function getCodeRuleDetail(id) {
  return request({
    url: `/code-rule/${id}`,
    method: 'get'
  })
}

// 新增（含字段，整体保存）
export function createCodeRule(data) {
  return request({
    url: '/code-rule',
    method: 'post',
    data
  })
}

// 编辑（含字段，整体覆盖）
export function updateCodeRule(id, data) {
  return request({
    url: `/code-rule/${id}`,
    method: 'put',
    data
  })
}

// 删除
export function deleteCodeRule(id) {
  return request({
    url: `/code-rule/${id}`,
    method: 'delete'
  })
}

// 启用/停用切换
export function toggleCodeRule(id) {
  return request({
    url: `/code-rule/${id}/toggle`,
    method: 'put'
  })
}

// 预览编码（不消耗序号）
export function previewCode(data) {
  return request({
    url: '/code-rule/preview',
    method: 'post',
    data
  })
}

// 获取指定规则的下一个编码预览，不消耗序号
export function getNextCode(ruleCode) {
  return request({
    url: `/code-rule/next-code/${ruleCode}`,
    method: 'get'
  })
}
