<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="dialogWidth"
    :close-on-click-modal="false"
    class="import-dialog"
    @closed="handleClosed"
  >
    <el-steps :active="activeStep" finish-status="success" simple class="import-steps">
      <el-step title="下载模板/上传文件" />
      <el-step title="预览校验" />
      <el-step title="导入结果" />
    </el-steps>

    <div v-if="step === 'upload'" class="import-upload">
      <div class="import-tip">
        <el-icon class="import-tip__icon"><InfoFilled /></el-icon>
        <div class="import-tip__content">
          <p>请先下载导入模板，按模板格式填写数据后上传。</p>
          <p>模板中标注“必填”的列不可为空，示例行可删除后再上传。</p>
        </div>
      </div>

      <div class="import-template">
        <el-button type="primary" :icon="Download" @click="openTemplateConfig">下载导入模板</el-button>
      </div>

      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx / .xls 格式，单次上传 1 个文件</div>
        </template>
      </el-upload>
    </div>

    <div v-if="step === 'preview'" class="import-preview">
      <el-descriptions :column="4" size="small" border class="import-summary">
        <el-descriptions-item label="总行数">{{ parsedRows.length }}</el-descriptions-item>
        <el-descriptions-item label="校验通过">
          <span class="is-success">{{ validRowCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="校验失败">
          <span :class="{ 'is-danger': errorRowCount }">{{ errorRowCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="错误数">
          <span :class="{ 'is-danger': validationErrors.length }">{{ validationErrors.length }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="preview-toolbar">
        <el-checkbox v-model="showOnlyErrors" :disabled="!validationErrors.length">只看错误行</el-checkbox>
        <el-button v-if="validationErrors.length" text type="primary" :icon="Download" @click="downloadValidationErrors">
          下载校验结果
        </el-button>
      </div>

      <el-table
        :data="previewRows"
        size="small"
        max-height="420"
        border
        stripe
        :cell-class-name="getPreviewCellClassName"
      >
        <el-table-column prop="__rowNo" label="行号" width="70" fixed="left" align="center" />
        <el-table-column label="状态" width="90" fixed="left" align="center">
          <template #default="{ row }">
            <el-tag v-if="getRowErrors(row.__rowNo).length" type="danger" size="small">错误</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误说明" min-width="220" fixed="left" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="error-text">{{ getRowErrors(row.__rowNo).map(item => item.message).join('；') }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-for="column in columns"
          :key="column.key"
          :prop="column.key"
          :label="column.required ? `${column.label}（必填）` : column.label"
          :min-width="column.width ? column.width * 8 : 140"
          show-overflow-tooltip
        />
      </el-table>
    </div>

    <div v-if="step === 'result'" class="import-result">
      <el-result :icon="resultInfo.icon" :title="resultInfo.title" :sub-title="resultInfo.subTitle" />
      <div v-if="serverErrors.length" class="import-errors">
        <div class="import-errors__title">
          <el-icon color="var(--el-color-danger)"><WarningFilled /></el-icon>
          以下数据导入失败：
        </div>
        <el-table :data="normalizedServerErrors" size="small" max-height="280" border stripe>
          <el-table-column prop="row" label="行号" width="80" align="center" />
          <el-table-column prop="label" label="字段" width="120" show-overflow-tooltip />
          <el-table-column prop="message" label="失败原因" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>
    </div>

    <template #footer>
      <template v-if="step === 'upload'">
        <el-button @click="visible = false">取消</el-button>
      </template>
      <template v-else-if="step === 'preview'">
        <el-button @click="resetToUpload">重新上传</el-button>
        <el-button
          type="primary"
          :disabled="validationErrors.length > 0 || !parsedRows.length"
          :loading="importing"
          @click="handleImport"
        >
          开始导入（{{ parsedRows.length }} 条）
        </el-button>
      </template>
      <template v-else-if="step === 'result'">
        <el-button @click="visible = false">关闭</el-button>
        <el-button v-if="serverErrors.length" :icon="Download" @click="downloadServerErrors">下载失败结果</el-button>
        <el-button v-if="serverErrors.length" type="primary" @click="resetToUpload">重新上传</el-button>
      </template>
    </template>
  </el-dialog>

  <el-dialog
    v-model="templateConfigVisible"
    title="设置导入模板字段"
    width="720px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="template-config">
      <el-alert
        title="必填字段已默认选中且不可取消，可按本次导入需要勾选其他字段后下载模板。"
        type="info"
        :closable="false"
        show-icon
      />
      <div class="template-field-panel">
        <div class="template-field-panel__toolbar">
          <el-checkbox
            v-model="templateAllChecked"
            :indeterminate="templateIndeterminate"
            @change="handleTemplateCheckAll"
          >
            全选可选字段
          </el-checkbox>
          <span class="template-field-panel__count">已选 {{ selectedTemplateFields.length }} / {{ columns.length }}</span>
        </div>
        <el-checkbox-group v-model="selectedTemplateFields" class="template-field-panel__grid">
          <el-checkbox
            v-for="column in columns"
            :key="column.key"
            :label="column.key"
            :disabled="column.required"
          >
            {{ column.label }}<span v-if="column.required" class="required-mark">必填</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    <template #footer>
      <el-button @click="templateConfigVisible = false">取消</el-button>
      <el-button type="primary" :icon="Download" @click="confirmDownloadTemplate">确认并下载模板</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { CircleCheckFilled, Download, InfoFilled, UploadFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { downloadTemplate, exportExcel, mapImportData, parseExcelFile, validateImportData } from '@/utils/excel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '导入数据' },
  columns: { type: Array, required: true },
  templateFileName: { type: String, default: '导入模板' },
  importFn: { type: Function, required: true },
  width: { type: String, default: '80vw' }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const dialogWidth = computed(() => props.width || '80vw')
const step = ref('upload')
const uploadRef = ref(null)
const parsedRows = ref([])
const validationErrors = ref([])
const importing = ref(false)
const serverErrors = ref([])
const importResult = ref(null)
const showOnlyErrors = ref(false)
const templateConfigVisible = ref(false)
const selectedTemplateFields = ref([])

const activeStep = computed(() => ({ upload: 0, preview: 1, result: 2 })[step.value] || 0)
const errorRowSet = computed(() => new Set(validationErrors.value.map(item => Number(item.row))))
const errorRowCount = computed(() => errorRowSet.value.size)
const validRowCount = computed(() => Math.max(parsedRows.value.length - errorRowCount.value, 0))
const requiredTemplateFields = computed(() => props.columns.filter(column => column.required).map(column => column.key))
const optionalTemplateFields = computed(() => props.columns.filter(column => !column.required).map(column => column.key))
const selectedOptionalTemplateFields = computed(() => selectedTemplateFields.value.filter(key => optionalTemplateFields.value.includes(key)))
const templateAllChecked = computed({
  get: () => optionalTemplateFields.value.length > 0 && selectedOptionalTemplateFields.value.length === optionalTemplateFields.value.length,
  set: val => handleTemplateCheckAll(val)
})
const templateIndeterminate = computed(() => selectedOptionalTemplateFields.value.length > 0 && selectedOptionalTemplateFields.value.length < optionalTemplateFields.value.length)
const previewRows = computed(() => {
  if (!showOnlyErrors.value) return parsedRows.value
  return parsedRows.value.filter(row => errorRowSet.value.has(Number(row.__rowNo)))
})

const resultInfo = computed(() => {
  const result = importResult.value
  if (!result) return {}
  if (result.failed === 0) return { icon: 'success', title: '导入成功', subTitle: `共导入 ${result.success} 条数据` }
  if (result.success === 0) return { icon: 'error', title: '导入失败', subTitle: `${result.failed} 条数据均导入失败` }
  return { icon: 'warning', title: '部分导入成功', subTitle: `成功 ${result.success} 条，失败 ${result.failed} 条` }
})

const normalizedServerErrors = computed(() => buildErrorRows(serverErrors.value))

function getRowErrors(rowNo) {
  return validationErrors.value.filter(item => Number(item.row) === Number(rowNo))
}

function getPreviewCellClassName({ row, column }) {
  if (!row?.__rowNo || !column?.property) return ''
  const hasError = validationErrors.value.some(item => Number(item.row) === Number(row.__rowNo) && item.field === column.property)
  return hasError ? 'import-cell-error' : ''
}

function resetTemplateFields() {
  selectedTemplateFields.value = [...requiredTemplateFields.value]
}

function openTemplateConfig() {
  resetTemplateFields()
  templateConfigVisible.value = true
}

function handleTemplateCheckAll(val) {
  selectedTemplateFields.value = val
    ? [...requiredTemplateFields.value, ...optionalTemplateFields.value]
    : [...requiredTemplateFields.value]
}

function confirmDownloadTemplate() {
  if (!selectedTemplateFields.value.length) return ElMessage.warning('请至少选择一个模板字段')
  const selectedSet = new Set(selectedTemplateFields.value)
  const templateColumns = props.columns.filter(column => selectedSet.has(column.key))
  downloadTemplate(templateColumns, props.templateFileName)
  templateConfigVisible.value = false
}

async function handleFileChange(uploadFile) {
  if (!uploadFile?.raw) return
  try {
    const rawData = await parseExcelFile(uploadFile.raw)
    if (!rawData.length) {
      validationErrors.value = [{ row: '-', field: '-', label: '-', message: '文件中没有数据行' }]
      parsedRows.value = []
      step.value = 'preview'
      return
    }
    parsedRows.value = mapImportData(rawData, props.columns)
    validationErrors.value = validateImportData(parsedRows.value, props.columns)
    showOnlyErrors.value = validationErrors.value.length > 0
    step.value = 'preview'
  } catch (error) {
    validationErrors.value = [{ row: '-', field: '-', label: '-', message: error.message }]
    parsedRows.value = []
    showOnlyErrors.value = true
    step.value = 'preview'
  }
}

function handleExceed() {
  uploadRef.value?.clearFiles()
}

async function handleImport() {
  importing.value = true
  try {
    const payloadRows = parsedRows.value.map(({ __rowNo, ...row }) => ({ __rowNo, ...row }))
    const res = await props.importFn(payloadRows)
    const data = res.data || res
    importResult.value = {
      success: Number(data.success || 0),
      failed: Number(data.failed || 0),
      total: Number(data.total || payloadRows.length)
    }
    serverErrors.value = data.errors || []
    step.value = 'result'
    if (!serverErrors.value.length) emit('success')
  } catch (error) {
    importResult.value = { success: 0, failed: parsedRows.value.length, total: parsedRows.value.length }
    serverErrors.value = [{ row: '-', label: '-', message: error.response?.data?.message || error.message || '导入请求失败' }]
    step.value = 'result'
  } finally {
    importing.value = false
  }
}

function buildErrorRows(errors) {
  return errors.map(item => {
    if (typeof item === 'string') {
      const match = item.match(/^Row\s+(\d+):\s*(.*)$/i) || item.match(/^第\s*(\d+)\s*行[：:]\s*(.*)$/)
      const message = match ? match[2] : item
      const fieldMatch = message.match(/^([^："“「]+)[："“「]/)
      return {
        row: match ? match[1] : '-',
        label: fieldMatch ? fieldMatch[1].trim() : '',
        value: '',
        message
      }
    }
    return {
      row: item.row ?? '-',
      label: item.label || item.field || '',
      value: item.value ?? '',
      message: item.message || ''
    }
  })
}

function downloadValidationErrors() {
  if (!validationErrors.value.length) return ElMessage.warning('暂无校验错误')
  exportExcel(buildErrorRows(validationErrors.value), [
    { key: 'row', label: '行号', width: 10 },
    { key: 'label', label: '字段', width: 18 },
    { key: 'value', label: '原始值', width: 20 },
    { key: 'message', label: '错误原因', width: 50 }
  ], `${props.templateFileName}_校验结果`)
}

function downloadServerErrors() {
  if (!serverErrors.value.length) return ElMessage.warning('暂无失败结果')
  exportExcel(normalizedServerErrors.value, [
    { key: 'row', label: '行号', width: 10 },
    { key: 'label', label: '字段', width: 18 },
    { key: 'value', label: '原始值', width: 20 },
    { key: 'message', label: '失败原因', width: 50 }
  ], `${props.templateFileName}_导入失败结果`)
}

function resetToUpload() {
  step.value = 'upload'
  parsedRows.value = []
  validationErrors.value = []
  serverErrors.value = []
  importResult.value = null
  showOnlyErrors.value = false
  uploadRef.value?.clearFiles()
}

function handleClosed() {
  resetToUpload()
}

watch(visible, val => {
  if (val) resetToUpload()
})
</script>

<style lang="scss" scoped>
.import-steps {
  margin-bottom: 18px;
}

.import-tip {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background-color: rgba(var(--primary-color-rgb), 0.06);
  border-radius: 6px;
  margin-bottom: 16px;

  &__icon {
    color: var(--el-color-primary);
    font-size: 18px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  &__content {
    font-size: 13px;
    color: var(--text-regular);
    line-height: 1.8;

    p { margin: 0; }
  }
}

.import-template {
  margin-bottom: 16px;
}

.template-config {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-field-panel {
  width: 100%;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 12px;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__count {
    font-size: 13px;
    color: var(--text-secondary);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 12px;
  }
}

.required-mark {
  display: inline-flex;
  align-items: center;
  height: 18px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 4px;
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 18px;
}

.import-summary {
  margin-bottom: 12px;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.is-success {
  color: var(--el-color-success);
  font-weight: 600;
}

.is-danger,
.error-text {
  color: var(--el-color-danger);
}

.import-errors {
  margin-top: 12px;

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }
}
</style>

<style lang="scss">
.import-dialog {
  .import-cell-error {
    background-color: var(--el-color-danger-light-9) !important;
    color: var(--el-color-danger);
  }
}
</style>
