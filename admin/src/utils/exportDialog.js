import { ElMessage } from 'element-plus'
import { exportExcel } from '@/utils/excel'

export function getExportTimestamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function pickExportFields(fields, keys) {
  return fields.filter(field => keys.includes(field.key))
}

export async function runDialogExport(options) {
  const {
    scope,
    fields,
    allFields,
    selectedRows = [],
    currentRows = [],
    fetchAll,
    fileName,
    emptyMessage = '暂无数据可导出'
  } = options

  let list = []
  if (scope === 'selected') {
    list = selectedRows
  } else if (scope === 'currentPage') {
    list = currentRows
  } else if (fetchAll) {
    list = await fetchAll()
  } else {
    list = currentRows
  }

  if (!list.length) {
    ElMessage.warning(emptyMessage)
    return
  }

  exportExcel(list, pickExportFields(allFields, fields), `${fileName}_${getExportTimestamp()}`)
  ElMessage.success(`已导出 ${list.length} 条数据`)
}

export async function fetchAllByPage(fetchList, baseParams = {}, pageSize = 100) {
  const first = await fetchList({ ...baseParams, page: 1, pageSize })
  const firstData = first.data || {}
  const list = [...(firstData.list || [])]
  const total = Number(firstData.total || list.length)
  const totalPages = Math.ceil(total / pageSize)

  for (let page = 2; page <= totalPages; page++) {
    const res = await fetchList({ ...baseParams, page, pageSize })
    list.push(...(res.data?.list || []))
  }

  return list
}
