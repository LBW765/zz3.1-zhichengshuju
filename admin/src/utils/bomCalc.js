/**
 * BOM 行计算方式:公式求值与依赖解析(从参考前端 bomCalc.ts 复刻为 JS)
 *
 * 概念:
 *   - 标准模式:requiredQty = (planQty * unitQty / outputQty) * (1 + lossRate%)
 *   - 公式模式:requiredQty = eval(tokens) * (1 + lossRate%)
 *     公式中可引用「生产数量 / 本行单位用量 / 其他物料需求量 / 数字 / 运算符 / 括号」
 *
 * BomCalcMethod 形态:
 *   { mode: 'standard' | 'formula', tokens?: BomFormulaToken[] }
 *
 * BomFormulaToken 形态:
 *   { type: 'planQty' | 'unitQty' | 'materialReq' | 'number' | 'op' | 'lparen' | 'rparen',
 *     materialId?, value?, op? }
 */

/** 单 token 友好展示文本 */
export function formatToken(t, resolveMaterialName) {
  switch (t.type) {
    case 'planQty':     return '生产数量'
    case 'unitQty':     return '单位用量'
    case 'materialReq': {
      const name = resolveMaterialName?.(t.materialId || '') || t.materialId || '?'
      return `[${name}.需求量]`
    }
    case 'number':      return String(t.value ?? 0)
    case 'op':          return ` ${t.op} `
    case 'lparen':      return '('
    case 'rparen':      return ')'
    default:            return ''
  }
}

/** 公式预览字符串 */
export function formatFormula(tokens, resolveMaterialName) {
  if (!tokens || tokens.length === 0) return ''
  return tokens.map(t => formatToken(t, resolveMaterialName)).join('').replace(/\s+/g, ' ').trim()
}

/** 简单括号匹配检查 */
export function checkParens(tokens) {
  let depth = 0
  for (const t of tokens) {
    if (t.type === 'lparen') depth++
    else if (t.type === 'rparen') depth--
    if (depth < 0) return false
  }
  return depth === 0
}

/** 校验公式语法 */
export function validateFormula(tokens) {
  if (!tokens || tokens.length === 0) return '公式为空'
  if (!checkParens(tokens)) return '括号不匹配'

  const isOperand = (t) =>
    t.type === 'planQty' || t.type === 'unitQty' || t.type === 'materialReq' || t.type === 'number'

  let prev = null
  for (const t of tokens) {
    if (prev) {
      const prevIsOperand = isOperand(prev) || prev.type === 'rparen'
      const curIsOperand  = isOperand(t)    || t.type === 'lparen'
      if (prevIsOperand && curIsOperand) return '相邻操作数缺少运算符'
      if (!prevIsOperand && !curIsOperand && !(prev.type === 'lparen' && t.type === 'lparen') && !(prev.type === 'rparen' && t.type === 'rparen')) {
        if (prev.type === 'op' && (t.type === 'op' || t.type === 'rparen')) return '运算符位置错误'
        if (prev.type === 'lparen' && t.type === 'op') return '左括号后不能直接跟运算符'
      }
    }
    prev = t
  }
  if (prev && prev.type === 'op') return '公式末尾不能是运算符'
  return null
}

/** 收集公式直接引用的其他物料 ID(用于依赖排序) */
export function getReferencedMaterialIds(method) {
  if (!method || method.mode !== 'formula' || !method.tokens) return []
  const set = new Set()
  for (const t of method.tokens) {
    if (t.type === 'materialReq' && t.materialId) set.add(t.materialId)
  }
  return [...set]
}

/** Shunting-yard:tokens -> RPN(逆波兰式) */
function toRpn(tokens) {
  const output = []
  const stack = []
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 }
  for (const t of tokens) {
    if (t.type === 'number' || t.type === 'planQty' || t.type === 'unitQty' || t.type === 'materialReq') {
      output.push(t)
    } else if (t.type === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1]
        if (top.type === 'op' && prec[top.op] >= prec[t.op]) {
          output.push(stack.pop())
        } else break
      }
      stack.push(t)
    } else if (t.type === 'lparen') {
      stack.push(t)
    } else if (t.type === 'rparen') {
      while (stack.length && stack[stack.length - 1].type !== 'lparen') {
        output.push(stack.pop())
      }
      stack.pop()
    }
  }
  while (stack.length) output.push(stack.pop())
  return output
}

function evalRpn(rpn, env) {
  const stack = []
  for (const t of rpn) {
    if (t.type === 'number') stack.push(Number(t.value || 0))
    else if (t.type === 'planQty') stack.push(env.planQty)
    else if (t.type === 'unitQty') stack.push(env.unitQty)
    else if (t.type === 'materialReq') {
      const v = env.resolvedReq.get(String(t.materialId || ''))
      if (v === undefined) throw new Error('引用的物料尚未计算')
      stack.push(v)
    } else if (t.type === 'op') {
      const b = stack.pop() ?? 0
      const a = stack.pop() ?? 0
      switch (t.op) {
        case '+': stack.push(a + b); break
        case '-': stack.push(a - b); break
        case '*': stack.push(a * b); break
        case '/': stack.push(b === 0 ? 0 : a / b); break
        default: stack.push(0)
      }
    }
  }
  return stack[0] ?? 0
}

/** 公式求值(不含损耗) */
export function evalFormulaQty(tokens, unitQty, ctx, resolvedReq) {
  const rpn = toRpn(tokens)
  return evalRpn(rpn, { planQty: ctx.planQty, unitQty, resolvedReq })
}

/** 标准模式基础需求量(不含损耗) */
export function evalStandardQty(unitQty, ctx) {
  const out = ctx.outputQty > 0 ? ctx.outputQty : 1
  return (ctx.planQty * unitQty) / out
}

/** 单行实际需求量(含损耗) */
export function evalLineRequiredQty(item, ctx, resolvedReq) {
  let base = 0
  if (item.calcMethod && item.calcMethod.mode === 'formula' && item.calcMethod.tokens?.length) {
    base = evalFormulaQty(item.calcMethod.tokens, Number(item.quantity || 0), ctx, resolvedReq)
  } else {
    base = evalStandardQty(Number(item.quantity || 0), ctx)
  }
  return base * (1 + (Number(item.lossRate || 0)) / 100)
}

/**
 * 全 BOM 拓扑排序求解:返回 materialId(string) -> 实际需求量 Map
 *
 * 公式模式可能引用其他物料的需求量;按依赖顺序求解。
 * 检测到循环依赖时,对应行返回 0(防止死循环)。
 */
export function solveBomRequirements(items, ctx) {
  const resolved = new Map()
  const byMaterial = new Map()
  for (const it of items) {
    if (it.materialId !== undefined && it.materialId !== null && it.materialId !== '') {
      byMaterial.set(String(it.materialId), it)
    }
  }

  const visiting = new Set()
  const dfs = (mid) => {
    if (resolved.has(mid)) return
    if (visiting.has(mid)) {
      resolved.set(mid, 0)
      return
    }
    const it = byMaterial.get(mid)
    if (!it) return
    visiting.add(mid)
    const refs = getReferencedMaterialIds(it.calcMethod)
    for (const r of refs) {
      if (String(r) !== String(mid)) dfs(String(r))
    }
    visiting.delete(mid)
    try {
      const v = evalLineRequiredQty(it, ctx, resolved)
      resolved.set(mid, isFinite(v) ? v : 0)
    } catch {
      resolved.set(mid, 0)
    }
  }

  for (const it of items) {
    if (it.materialId !== undefined && it.materialId !== null && it.materialId !== '') {
      dfs(String(it.materialId))
    }
  }
  return resolved
}

/** 计算方式简短标签(表格内显示用) */
export function calcMethodLabel(method) {
  if (!method || method.mode === 'standard') return '生产数量×用量'
  const tokens = method.tokens || []
  if (!tokens.length) return '自定义公式'
  const text = tokens.map((t) => {
    switch (t.type) {
      case 'planQty':     return '生产数量'
      case 'unitQty':     return '单位用量'
      case 'materialReq': return '引用料需求量'
      case 'number':      return String(t.value ?? 0)
      case 'op':          return t.op === '*' ? '×' : t.op === '/' ? '÷' : t.op || ''
      case 'lparen':      return '('
      case 'rparen':      return ')'
      default:            return ''
    }
  }).join('')
  return text.length > 14 ? '自定义公式' : text
}
