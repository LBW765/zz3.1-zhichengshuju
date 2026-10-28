<template>
  <div class="page-shell">
    <PageHeader title="工序管理" description="管理工序定义、工时标准与作业指导书" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入</el-button>
        <el-button :icon="Download" @click="exportVisible = true">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
        <el-button type="primary" :icon="Plus" @click="showDialog()">新增工序</el-button>
      </template>
    </PageHeader>

    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编码/名称</span>
            <el-input v-model="search.keyword" placeholder="请输入编码或名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">关键工序</span>
            <el-select v-model="search.isKeyProcess" placeholder="全部" clearable style="width: 120px">
              <el-option label="是" :value="1" />
              <el-option label="否" :value="0" />
            </el-select>
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="page-card page-shell__section" style="overflow: hidden">
      <div class="table-shell">
        <el-table :data="tableData" v-loading="loading" stripe :fit="false" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="45" />
          <el-table-column prop="processCode" label="工序编码" min-width="120" show-overflow-tooltip />
          <el-table-column prop="processName" label="工序名称" min-width="120" show-overflow-tooltip />
          <el-table-column label="关键工序" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isKeyProcess === 1 ? 'warning' : 'info'" size="small">
                {{ row.isKeyProcess === 1 ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="强检" width="70" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isForceInspection === 1" type="danger" size="small">强检</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="equipmentType" label="设备类型" min-width="100" show-overflow-tooltip />
          <el-table-column prop="skillLevel" label="技能等级" width="80" align="center" />
          <el-table-column label="标准工时" width="100" align="center">
            <template #default="{ row }">
              {{ formatStandardTime(row.standardTime) }}
            </template>
          </el-table-column>
          <el-table-column label="作业指导书" width="120" align="center">
            <template #default="{ row }">
              <el-popover
                v-if="row.attachmentCount > 0"
                placement="bottom"
                :width="320"
                trigger="click"
                @show="loadRowAttachments(row)"
              >
                <template #reference>
                  <el-button type="primary" link size="small">
                    <el-icon><Document /></el-icon>
                    {{ row.attachmentCount }}个文件
                  </el-button>
                </template>
                <div class="popover-attachment-list" v-loading="popoverLoading">
                  <div v-for="item in popoverAttachments" :key="item.id" class="popover-attachment-item">
                    <el-icon class="popover-attachment-item__icon"><Document /></el-icon>
                    <span class="popover-attachment-item__name" :title="item.fileName">{{ item.fileName }}</span>
                    <a :href="getDownloadUrl(item.filePath)" :download="item.fileName" class="popover-attachment-item__download" target="_blank">
                      <el-icon><Download /></el-icon>
                    </a>
                  </div>
                  <div v-if="!popoverAttachments.length && !popoverLoading" style="text-align: center; color: var(--text-secondary); font-size: 13px; padding: 8px 0;">
                    暂无附件
                  </div>
                </div>
              </el-popover>
              <span v-else style="color: var(--text-light); font-size: 12px;">无</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.status"
                :active-value="1"
                :inactive-value="0"
                size="small"
                @change="(val) => handleStatusChange(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right" align="left">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="primary" link size="small" @click="showDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无工序数据" :image-size="60" />
          </template>
        </el-table>
      </div>
      <Pagination :total="total" v-model:page="page" v-model:limit="pageSize" @pagination="fetchList" />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingItem ? '编辑工序' : '新增工序'"
      width="760px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工序编码" prop="processCode">
              <el-input v-model="form.processCode" placeholder="请输入工序编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工序名称" prop="processName">
              <el-input v-model="form.processName" placeholder="请输入工序名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备类型">
              <el-select v-model="form.equipmentType" placeholder="请选择设备分类" clearable filterable style="width: 100%">
                <el-option
                  v-for="item in equipmentTypeOptions"
                  :key="item.id"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="技能等级">
              <el-select v-model="form.skillLevel" placeholder="请选择技能等级" clearable style="width: 100%">
                <el-option label="初级" value="初级" />
                <el-option label="中级" value="中级" />
                <el-option label="高级" value="高级" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标准工时">
              <el-input-number
                v-model="form.standardTime"
                :min="0"
                :controls="false"
                style="width: 100%"
                placeholder="单位：秒"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="关键工序">
              <el-switch
                v-model="form.isKeyProcess"
                :active-value="1"
                :inactive-value="0"
                @change="handleKeyProcessChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="质检工序">
              <el-switch v-model="form.isInspection" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="强制质检">
              <el-switch v-model="form.isForceInspection" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="工序描述">
              <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="请输入工序描述" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="作业指导书">
              <template v-if="editingItem">
                <el-upload
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :on-success="handleUploadSuccess"
                  :before-upload="beforeUpload"
                  :show-file-list="false"
                  :disabled="uploading"
                >
                  <el-button type="primary" size="small" :loading="uploading">
                    <el-icon><Upload /></el-icon>
                    上传附件
                  </el-button>
                  <template #tip>
                    <div class="el-upload__tip">支持常见文档格式，单个文件不超过 10MB</div>
                  </template>
                </el-upload>
                <div v-if="attachments.length" class="attachment-list">
                  <div v-for="item in attachments" :key="item.id" class="attachment-list__item">
                    <el-icon class="attachment-list__icon"><Document /></el-icon>
                    <span class="attachment-list__name" :title="item.fileName">{{ item.fileName }}</span>
                    <span class="attachment-list__size">{{ formatFileSize(item.fileSize) }}</span>
                    <a :href="getDownloadUrl(item.filePath)" :download="item.fileName" target="_blank" class="attachment-list__download">
                      <el-icon><Download /></el-icon>
                    </a>
                    <el-button type="danger" link size="small" @click="handleDeleteAttachment(item)">删除</el-button>
                  </div>
                </div>
                <el-empty v-else description="暂无附件" :image-size="40" />
              </template>
              <div v-else class="attachment-tip">
                <el-icon :size="16"><InfoFilled /></el-icon>
                <span>请先保存工序，再上传作业指导书附件</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 工序导入 -->
    <ImportDialog
      v-model="importVisible"
      title="导入工序"
      :columns="importColumns"
      template-file-name="工序导入模板"
      :import-fn="importProcess"
      @success="handleImportSuccess"
    />

    <ExportDialog
      v-model="exportVisible"
      title="导出工序"
      :fields="exportFields"
      :selected-count="selectedRows.length"
      :current-page-count="tableData.length"
      :total-count="total"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Download, InfoFilled, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { fetchAllByPage, runDialogExport } from '@/utils/exportDialog'
import Cookies from 'js-cookie'
import { getNextCode } from '@/api/codeRule'
import {
  getProcessList, createProcess, updateProcess, updateProcessStatus, deleteProcess,
  getProcessDetail, addProcessAttachment, deleteProcessAttachment,
  importProcess, getEquipmentCategoryList
} from '@/api/basicData'

// ——— 标准工时格式化 ———

function formatStandardTime(seconds) {
  if (!seconds && seconds !== 0) return '-'
  if (seconds === 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}min`)
  if (s > 0) parts.push(`${s}s`)
  return parts.join(' ') || '0s'
}

// ——— 搜索 ———

const search = ref({ keyword: '', isKeyProcess: '' })

function handleSearch() {
  page.value = 1
  fetchList()
}

function resetSearch() {
  search.value = { keyword: '', isKeyProcess: '' }
  page.value = 1
  fetchList()
}

// ——— 列表 ———

const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const equipmentTypeOptions = ref([])

async function fetchEquipmentTypeOptions() {
  try {
    const res = await getEquipmentCategoryList({ status: 1 })
    const list = Array.isArray(res.data?.list) ? res.data.list : []
    equipmentTypeOptions.value = list.map((item) => ({
      id: item.id,
      value: item.categoryName,
      label: item.categoryCode ? `${item.categoryCode} - ${item.categoryName}` : item.categoryName
    }))
  } catch (e) {
    console.error(e)
    equipmentTypeOptions.value = []
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.isKeyProcess !== '') params.isKeyProcess = search.value.isKeyProcess
    const res = await getProcessList(params)
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function handleRefresh() {
  resetSearch()
}

// ——— 状态切换 ———

async function handleStatusChange(row, val) {
  try {
    await updateProcessStatus(row.id, { status: val })
    ElMessage.success(val ? '已启用' : '已停用')
  } catch (e) {
    row.status = val ? 0 : 1
  }
}

// ——— 删除 ———

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除工序「${row.processName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteProcess(row.id)
    ElMessage.success('删除成功')
    await fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 弹窗 ———

const dialogVisible = ref(false)
const editingItem = ref(null)
const formRef = ref(null)

function defaultForm() {
  return {
    processCode: '',
    processName: '',
    equipmentType: '',
    skillLevel: '',
    standardTime: null,
    isKeyProcess: 0,
    isInspection: 0,
    isForceInspection: 0,
    description: '',
    status: 1,
    remark: ''
  }
}

const form = ref(defaultForm())

const rules = {
  processCode: [{ required: true, message: '请输入工序编码', trigger: 'blur' }],
  processName: [{ required: true, message: '请输入工序名称', trigger: 'blur' }]
}

function getProcessTypeByKeyFlag(isKeyProcess) {
  return Number(isKeyProcess) === 1 ? '关键工序' : '普通工序'
}

async function showDialog(row) {
  editingItem.value = row || null
  attachments.value = []
  if (row) {
    try {
      const res = await getProcessDetail(row.id)
      const detail = res.data || row
      form.value = {
        processCode: detail.processCode || '',
        processName: detail.processName || '',
        equipmentType: detail.equipmentType || '',
        skillLevel: detail.skillLevel || '',
        standardTime: detail.standardTime ?? null,
        isKeyProcess: detail.isKeyProcess ?? (detail.processType === '关键工序' ? 1 : 0),
        isInspection: detail.isInspection ?? 0,
        isForceInspection: detail.isForceInspection ?? 0,
        description: detail.description || '',
        status: detail.status ?? 1,
        remark: detail.remark || ''
      }
      attachments.value = detail.attachments || []
    } catch (e) {
      form.value = {
        processCode: row.processCode || '',
        processName: row.processName || '',
        equipmentType: row.equipmentType || '',
        skillLevel: row.skillLevel || '',
        standardTime: row.standardTime ?? null,
        isKeyProcess: row.isKeyProcess ?? (row.processType === '关键工序' ? 1 : 0),
        isInspection: row.isInspection ?? 0,
        isForceInspection: row.isForceInspection ?? 0,
        description: row.description || '',
        status: row.status ?? 1,
        remark: row.remark || ''
      }
    }
  } else {
    form.value = defaultForm()
    getNextCode('process').then(res => {
      if (res.data?.preview) form.value.processCode = res.data.preview
    }).catch(() => {})
  }
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.resetFields()
  editingItem.value = null
}

function handleKeyProcessChange(val) {
  if (val === 1) {
    ElMessage.info('建议同时开启强制质检')
  }
}

async function handleSave() {
  try {
    await formRef.value.validate()
    const payload = {
      ...form.value,
      processType: getProcessTypeByKeyFlag(form.value.isKeyProcess)
    }
    if (editingItem.value) {
      await updateProcess(editingItem.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createProcess(payload)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

// ——— 列表附件弹窗 ———

const popoverLoading = ref(false)
const popoverAttachments = ref([])

async function loadRowAttachments(row) {
  popoverLoading.value = true
  popoverAttachments.value = []
  try {
    const res = await getProcessDetail(row.id)
    popoverAttachments.value = res.data?.attachments || []
  } catch (e) {
    console.error(e)
  } finally {
    popoverLoading.value = false
  }
}

function getDownloadUrl(filePath) {
  if (!filePath) return '#'
  return `${import.meta.env.VITE_APP_BASE_API}${filePath}`
}

// ——— 附件上传 ———

const uploadUrl = computed(() => `${import.meta.env.VITE_APP_BASE_API}/system/upload`)
const uploadHeaders = computed(() => {
  const token = Cookies.get('Admin-Token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})
const uploading = ref(false)
const attachments = ref([])

function formatFileSize(bytes) {
  if (!bytes) return '0B'
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

function beforeUpload(file) {
  if (file.size / 1024 / 1024 > 10) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }
  uploading.value = true
  return true
}

async function handleUploadSuccess(response) {
  uploading.value = false
  if (response?.code !== 200 || !response?.data?.url) {
    ElMessage.error('上传失败')
    return
  }
  try {
    await addProcessAttachment(editingItem.value.id, {
      fileName: response.data.originalName || response.data.url.split('/').pop(),
      filePath: response.data.url,
      fileSize: response.data.size || 0
    })
    ElMessage.success('附件上传成功')
    await loadAttachments(editingItem.value.id)
    await fetchList()
  } catch (e) {
    ElMessage.error('附件记录保存失败')
  }
}

async function loadAttachments(processId) {
  try {
    const res = await getProcessDetail(processId)
    attachments.value = res.data?.attachments || []
  } catch (e) {
    attachments.value = []
  }
}

async function handleDeleteAttachment(item) {
  try {
    await ElMessageBox.confirm(`确定删除附件「${item.fileName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteProcessAttachment(editingItem.value.id, item.id)
    ElMessage.success('删除成功')
    await loadAttachments(editingItem.value.id)
    await fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 导入导出 ———

const importVisible = ref(false)
const exportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const importColumns = [
  { key: 'processCode', label: '工序编码', required: true, example: 'GX-001', width: 14 },
  { key: 'processName', label: '工序名称', required: true, example: '车削', width: 14 },
  { key: 'isKeyProcess', label: '关键工序', example: '否', width: 10, note: '是/否' },
  { key: 'isInspection', label: '质检工序', example: '否', width: 10, note: '是/否' },
  { key: 'isForceInspection', label: '强制质检', example: '否', width: 10, note: '是/否' },
  { key: 'equipmentType', label: '设备类型', example: '数控车床', width: 14 },
  { key: 'skillLevel', label: '技能等级', example: '中级', width: 10, note: '初级/中级/高级' },
  { key: 'standardTime', label: '标准工时(秒)', example: '120', width: 14 },
  { key: 'description', label: '工序描述', example: '', width: 20 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const exportFields = [
  { key: 'processCode', label: '工序编码', width: 14 },
  { key: 'processName', label: '工序名称', width: 14 },
  { key: 'isKeyProcess', label: '关键工序', width: 10, formatter: (v) => v === 1 ? '是' : '否' },
  { key: 'isInspection', label: '质检工序', width: 10, formatter: (v) => v === 1 ? '是' : '否' },
  { key: 'isForceInspection', label: '强制质检', width: 10, formatter: (v) => v === 1 ? '是' : '否' },
  { key: 'equipmentType', label: '设备类型', width: 14 },
  { key: 'skillLevel', label: '技能等级', width: 10 },
  { key: 'standardTime', label: '标准工时(秒)', width: 14 },
  { key: 'description', label: '工序描述', width: 20 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleImportSuccess() {
  fetchList()
}

async function handleExport({ scope, fields }) {
  const filters = {}
  if (search.value.keyword) filters.keyword = search.value.keyword
  if (search.value.isKeyProcess !== '') filters.isKeyProcess = search.value.isKeyProcess

  await runDialogExport({
    scope,
    fields,
    allFields: exportFields,
    selectedRows: selectedRows.value,
    currentRows: tableData.value,
    fetchAll: () => fetchAllByPage(getProcessList, filters),
    fileName: '工序'
  })
}

// ——— 初始化 ———

onMounted(() => {
  fetchEquipmentTypeOptions()
  fetchList()
})
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  &__fields {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  &__label {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.attachment-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.attachment-list {
  margin-top: 8px;
  width: 100%;

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--bg-hover);
    }
  }

  &__icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    font-size: 12px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  &__download {
    color: var(--el-color-primary);
    flex-shrink: 0;
    cursor: pointer;
    display: flex;
    align-items: center;

    &:hover {
      opacity: 0.8;
    }
  }
}

.popover-attachment-list {
  max-height: 240px;
  overflow-y: auto;
}

.popover-attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-lighter);

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__download {
    color: var(--el-color-primary);
    flex-shrink: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(var(--primary-color-rgb), 0.1);
    }
  }
}
</style>
