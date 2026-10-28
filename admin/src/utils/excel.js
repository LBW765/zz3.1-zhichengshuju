import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function requiredLabel(label) {
  return `${label}（必填）`
}

function normalizeHeader(header) {
  return String(header || '')
    .replace(/\n.*/s, '')
    .replace(/（必填）$/, '')
    .trim()
}

export function generateTemplate(columns, sheetName = '导入模板') {
  const headerRow = columns.map(col => {
    let label = col.required ? requiredLabel(col.label) : col.label
    if (col.note) label += `\n${col.note}`
    return label
  })
  const exampleRow = columns.map(col => col.example ?? '')
  const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow])

  ws['!cols'] = columns.map(col => ({ wch: col.width || Math.max(col.label.length * 2.5, 16) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

export function downloadTemplate(columns, fileName, sheetName) {
  const wb = generateTemplate(columns, sheetName || '导入模板')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${fileName}.xlsx`)
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })
        resolve(jsonData)
      } catch (_error) {
        reject(new Error('文件解析失败，请确认是有效的 Excel 文件'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function mapImportData(rawRows, columns) {
  return rawRows.map((raw, index) => {
    const row = { __rowNo: index + 2 }
    for (const [header, value] of Object.entries(raw)) {
      const cleanHeader = normalizeHeader(header)
      const col = columns.find(item => item.label === cleanHeader)
      if (col) row[col.key] = value
    }
    return row
  })
}

export function validateImportData(rows, columns) {
  const errors = []
  const uniqueMaps = new Map()

  columns.forEach(col => {
    if (col.unique) uniqueMaps.set(col.key, new Map())
  })

  rows.forEach((row, idx) => {
    const rowNum = row.__rowNo || idx + 2
    columns.forEach(col => {
      const val = row[col.key]
      const isEmpty = val === undefined || val === null || val === ''

      if (col.required && isEmpty) {
        errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」不能为空` })
      }

      if (!isEmpty && col.type === 'number' && Number.isNaN(Number(val))) {
        errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」必须是数字` })
      }

      if (!isEmpty && col.enum?.length && !col.enum.includes(String(val).trim())) {
        errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」只能填写：${col.enum.join('、')}` })
      }

      if (!isEmpty && col.maxLength && String(val).length > col.maxLength) {
        errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」不能超过${col.maxLength}个字符` })
      }

      if (!isEmpty && col.unique) {
        const cleanVal = String(val).trim()
        const map = uniqueMaps.get(col.key)
        if (map.has(cleanVal)) {
          errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」与第${map.get(cleanVal)}行重复` })
        } else {
          map.set(cleanVal, rowNum)
        }
      }

      if (!isEmpty && col.validate) {
        const msg = col.validate(val, row)
        if (msg) {
          errors.push({ row: rowNum, field: col.key, label: col.label, value: val, message: `第${rowNum}行：「${col.label}」${msg}` })
        }
      }
    })
  })

  return errors
}

export function exportExcel(data, columns, fileName) {
  const headerRow = columns.map(col => col.label)
  const dataRows = data.map(item =>
    columns.map(col => {
      if (col.formatter) return col.formatter(item[col.key], item)
      return item[col.key] ?? ''
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  ws['!cols'] = columns.map(col => ({ wch: col.width || Math.max(col.label.length * 2.5, 16) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, fileName || 'Sheet1')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${fileName}.xlsx`)
}
