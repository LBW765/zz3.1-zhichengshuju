<template>
  <div class="page-shell">
    <PageHeader title="工艺路线" description="管理工艺路线与工序流程，关联适用物料" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button :icon="Download" @click="exportVisible = true">导出</el-button>
      </template>
    </PageHeader>

    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编码/名称</span>
            <el-input v-model="searchKeyword" placeholder="请输入编码或名称" clearable style="width: 200px" @keyup.enter="fetchRouteList" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">状态</span>
            <el-select v-model="searchStatus" placeholder="全部" clearable style="width: 120px" @change="fetchRouteList">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="fetchRouteList">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <div class="split-panel page-shell__section">
      <!-- 左侧：路线列表 -->
      <div class="split-panel__left">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">路线列表</span>
              <span class="panel-header__actions">
                <el-button type="primary" :icon="Plus" size="small" circle title="新增路线" @click="showRouteDialog()" />
                <el-dropdown trigger="click" @command="handleRouteCommand">
                  <el-button :icon="MoreFilled" size="small" circle title="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="import" :icon="Upload">导入路线</el-dropdown-item>
                      <el-dropdown-item command="export" :icon="Download">导出路线</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
          <el-table
            ref="routeTableRef"
            :data="filteredRouteList"
            v-loading="routeLoading"
            highlight-current-row
            size="small"
            @current-change="handleRouteSelect"
          >
            <el-table-column prop="routeName" label="路线名称" min-width="100" show-overflow-tooltip />
            <el-table-column prop="routeCode" label="编码" width="90" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="60" align="center" />
            <el-table-column label="状态" width="60" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="left">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" link size="small" @click.stop="showRouteDialog(row)">编辑</el-button>
                  <el-button type="danger" link size="small" @click.stop="handleDeleteRoute(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无工艺路线" :image-size="60" />
            </template>
          </el-table>
        </el-card>
      </div>

      <!-- 右侧：工序流程 & 关联物料 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card" v-loading="detailLoading">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ selectedRoute ? `${selectedRoute.routeName} — 工序流程` : '工序流程' }}</span>
            </div>
          </template>

          <!-- 未选中状态 -->
          <el-empty v-if="!selectedRoute" description="请先选择左侧工艺路线" :image-size="80" />

          <!-- 已选中路线 -->
          <template v-else>
            <!-- 工序流程卡片区 -->
            <div class="flow-area" v-if="routeDetail.steps && routeDetail.steps.length">
              <template v-for="(step, idx) in routeDetail.steps" :key="step.id || idx">
                <div class="flow-card">
                  <div class="flow-seq">{{ step.seq }}</div>
                  <div class="flow-card__name">{{ step.processName }}</div>
                  <div class="flow-card__code">{{ step.processCode }}</div>
                  <div class="flow-card__info" v-if="step.standardTime">
                    <span class="flow-card__label">标准工时</span>
                    <span>{{ formatTime(step.standardTime) }}</span>
                  </div>
                  <div class="flow-card__info" v-if="step.equipmentType">
                    <span class="flow-card__label">设备类型</span>
                    <span>{{ step.equipmentType }}</span>
                  </div>
                  <el-tag v-if="step.isKeyProcess" type="danger" size="small" class="flow-card__badge">关键</el-tag>
                  <div v-if="step.attachments && step.attachments.length" class="flow-card__attachments">
                    <el-popover placement="bottom" :width="300" trigger="click">
                      <template #reference>
                        <el-button type="primary" link size="small">
                          <el-icon><Document /></el-icon>
                          作业指导书({{ step.attachments.length }})
                        </el-button>
                      </template>
                      <div class="flow-popover-list">
                        <div v-for="att in step.attachments" :key="att.id" class="flow-popover-item">
                          <el-icon class="flow-popover-item__icon"><Document /></el-icon>
                          <span class="flow-popover-item__name" :title="att.fileName">{{ att.fileName }}</span>
                          <a :href="getDownloadUrl(att.filePath)" :download="att.fileName" target="_blank" class="flow-popover-item__download">
                            <el-icon><Download /></el-icon>
                          </a>
                        </div>
                      </div>
                    </el-popover>
                  </div>
                  <div v-else class="flow-card__no-attachment">暂无作业指导书</div>
                </div>
                <el-icon v-if="idx < routeDetail.steps.length - 1" class="flow-arrow"><ArrowRight /></el-icon>
              </template>
            </div>
            <el-empty v-else description="暂无工序" :image-size="60" />

            <el-divider />

            <!-- 关联物料 -->
            <div class="material-section">
              <div class="material-section__header">
                <span class="material-section__title">关联物料</span>
                <el-tag size="small" round>{{ routeDetail.materials ? routeDetail.materials.length : 0 }}</el-tag>
              </div>
              <div class="table-shell" v-if="routeDetail.materials && routeDetail.materials.length">
                <el-table :data="routeDetail.materials" size="small" stripe :fit="false">
                  <el-table-column prop="materialCode" label="物料编码" min-width="120" show-overflow-tooltip />
                  <el-table-column prop="materialName" label="物料名称" min-width="140" show-overflow-tooltip />
                  <el-table-column prop="spec" label="规格" min-width="120" show-overflow-tooltip />
                  <el-table-column prop="materialType" label="物料类型" width="100" />
                </el-table>
              </div>
              <el-empty v-else description="暂无关联物料" :image-size="40" />
            </div>
          </template>
        </el-card>
      </div>
    </div>

    <!-- 新增/编辑路线弹窗 -->
    <el-dialog
      v-model="routeDialogVisible"
      :title="editingRoute ? '编辑工艺路线' : '新增工艺路线'"
      width="760px"
      :close-on-click-modal="false"
      @closed="handleRouteDialogClosed"
    >
      <el-form ref="routeFormRef" :model="routeForm" :rules="routeRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="路线编码" prop="routeCode">
              <el-input v-model="routeForm.routeCode" placeholder="请输入路线编码" :disabled="!!editingRoute" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="路线名称" prop="routeName">
              <el-input v-model="routeForm.routeName" placeholder="请输入路线名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="路线类型" prop="routeType">
              <el-select v-model="routeForm.routeType" placeholder="请选择" style="width: 100%">
                <el-option label="标准路线" value="标准路线" />
                <el-option label="试制路线" value="试制路线" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本" prop="version">
              <el-input v-model="routeForm.version" placeholder="如 V1.0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="routeForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述">
              <el-input v-model="routeForm.description" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 工序步骤 -->
        <el-divider content-position="left">工序步骤</el-divider>
        <div class="table-shell">
          <el-table :data="routeForm.steps" size="small" :fit="false" border>
            <el-table-column label="序号" width="60" align="center">
              <template #default="{ $index }">{{ $index + 1 }}</template>
            </el-table-column>
            <el-table-column label="工序" min-width="220">
              <template #default="{ row }">
                <el-select
                  v-model="row.processId"
                  placeholder="请选择工序"
                  filterable
                  style="width: 100%"
                  @change="(val) => handleProcessChange(row, val)"
                >
                  <el-option
                    v-for="p in allProcessList"
                    :key="p.id"
                    :label="`${p.processName} (${p.processCode})`"
                    :value="p.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="可选" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="left" fixed="right">
              <template #default="{ $index }">
                <div class="table-actions">
                  <el-button type="danger" link size="small" @click="removeStep($index)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <span style="font-size: 13px; color: var(--text-secondary)">暂无工序，请点击下方按钮添加</span>
            </template>
          </el-table>
        </div>
        <div style="margin-top: 12px">
          <el-button type="primary" text :icon="Plus" @click="addStep">添加工序</el-button>
        </div>

        <!-- 关联物料 -->
        <el-divider content-position="left">关联物料</el-divider>
        <div class="dialog-material-section">
          <div class="dialog-material-tags" v-if="routeForm.materialIds.length">
            <el-tag
              v-for="mid in routeForm.materialIds"
              :key="mid"
              closable
              size="default"
              @close="removeMaterial(mid)"
            >
              {{ getMaterialLabel(mid) }}
            </el-tag>
          </div>
          <el-select
            v-model="routeForm.materialIds"
            multiple
            filterable
            placeholder="选择物料"
            style="width: 100%"
            collapse-tags
            collapse-tags-tooltip
          >
            <el-option
              v-for="m in allMaterialList"
              :key="m.id"
              :label="`${m.materialName} (${m.materialCode})`"
              :value="m.id"
            />
          </el-select>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="routeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoute">保存</el-button>
      </template>
    </el-dialog>

    <!-- 工艺路线导入（仅导入路线基本信息，工序步骤请在页面中配置） -->
    <ImportDialog
      v-model="importVisible"
      title="导入工艺路线（仅基本信息，工序步骤请在页面中配置）"
      :columns="importColumns"
      template-file-name="工艺路线导入模板"
      :import-fn="importProcessRoute"
      @success="handleImportSuccess"
    />

    <ExportDialog
      v-model="exportVisible"
      title="导出工艺路线"
      :fields="exportFields"
      :allow-selected="false"
      :current-page-count="routeList.length"
      :total-count="routeList.length"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Document, Download, MoreFilled, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { runDialogExport } from '@/utils/exportDialog'
import { getNextCode } from '@/api/codeRule'
import {
  getProcessRouteList, getProcessRouteDetail, createProcessRoute, updateProcessRoute,
  updateProcessRouteStatus, deleteProcessRoute,
  getProcessList, getMaterialList,
  importProcessRoute
} from '@/api/basicData'

// ——— 路线列表 ———

const routeTableRef = ref(null)
const routeList = ref([])
const routeLoading = ref(false)
const selectedRoute = ref(null)
const searchKeyword = ref('')
const searchStatus = ref(undefined)

const filteredRouteList = computed(() => routeList.value)

function resetSearch() {
  searchKeyword.value = ''
  searchStatus.value = undefined
  selectedRoute.value = null
  routeDetail.value = { steps: [], materials: [] }
  routeTableRef.value?.setCurrentRow()
  fetchRouteList()
}

async function fetchRouteList() {
  routeLoading.value = true
  try {
    const params = {}
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (searchStatus.value !== undefined && searchStatus.value !== '') params.status = searchStatus.value
    const res = await getProcessRouteList(params)
    routeList.value = res.data.list || res.data || []
    if (selectedRoute.value) {
      const still = routeList.value.find(r => r.id === selectedRoute.value.id)
      if (still) {
        selectedRoute.value = still
      } else {
        selectedRoute.value = null
        routeDetail.value = { steps: [], materials: [] }
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    routeLoading.value = false
  }
}

function handleRouteSelect(row) {
  selectedRoute.value = row || null
  if (row) {
    fetchRouteDetail(row.id)
  } else {
    routeDetail.value = { steps: [], materials: [] }
  }
}

// ——— 路线详情（右侧） ———

const detailLoading = ref(false)
const routeDetail = ref({ steps: [], materials: [] })

async function fetchRouteDetail(id) {
  detailLoading.value = true
  try {
    const res = await getProcessRouteDetail(id)
    const data = res.data || {}
    routeDetail.value = {
      steps: data.items || [],
      materials: data.materials || []
    }
  } catch (e) {
    console.error(e)
    routeDetail.value = { steps: [], materials: [] }
  } finally {
    detailLoading.value = false
  }
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return ''
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

function getDownloadUrl(filePath) {
  if (!filePath) return '#'
  return `${import.meta.env.VITE_APP_BASE_API}${filePath}`
}

// ——— 辅助数据 ———

const allProcessList = ref([])
const allMaterialList = ref([])

async function fetchProcesses() {
  try {
    const res = await getProcessList({ pageSize: 9999 })
    allProcessList.value = res.data.list || res.data || []
  } catch (e) {
    console.error(e)
  }
}

async function fetchMaterials() {
  try {
    const res = await getMaterialList({ pageSize: 9999 })
    allMaterialList.value = res.data.list || res.data || []
  } catch (e) {
    console.error(e)
  }
}

function getMaterialLabel(id) {
  const m = allMaterialList.value.find(item => item.id === id)
  return m ? `${m.materialName} (${m.materialCode})` : `物料#${id}`
}

// ——— 新增/编辑弹窗 ———

const routeDialogVisible = ref(false)
const editingRoute = ref(null)
const routeFormRef = ref(null)

function defaultRouteForm() {
  return {
    routeCode: '',
    routeName: '',
    routeType: '标准路线',
    version: '',
    description: '',
    status: 1,
    steps: [],
    materialIds: []
  }
}
const routeForm = ref(defaultRouteForm())

const routeRules = {
  routeCode: [{ required: true, message: '请输入路线编码', trigger: 'blur' }],
  routeName: [{ required: true, message: '请输入路线名称', trigger: 'blur' }],
  routeType: [{ required: true, message: '请选择路线类型', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }]
}

async function showRouteDialog(row) {
  // Ensure auxiliary data is loaded
  if (!allProcessList.value.length) await fetchProcesses()
  if (!allMaterialList.value.length) await fetchMaterials()

  editingRoute.value = row || null
  if (row) {
    // Fetch detail for editing
    try {
      const res = await getProcessRouteDetail(row.id)
      const data = res.data || {}
      const steps = (data.items || []).map((s) => ({
        processId: s.processId,
        remark: s.remark || ''
      }))
      const materialIds = (data.materials || []).map(m => m.materialId)
      routeForm.value = {
        routeCode: row.routeCode || '',
        routeName: row.routeName || '',
        routeType: row.routeType || '标准路线',
        version: row.version || '',
        description: row.description || '',
        status: row.status ?? 1,
        steps,
        materialIds
      }
    } catch (e) {
      console.error(e)
      routeForm.value = {
        routeCode: row.routeCode || '',
        routeName: row.routeName || '',
        routeType: row.routeType || '标准路线',
        version: row.version || '',
        description: row.description || '',
        status: row.status ?? 1,
        steps: [],
        materialIds: []
      }
    }
  } else {
    routeForm.value = defaultRouteForm()
    getNextCode('process_route').then(res => {
      if (res.data?.preview) routeForm.value.routeCode = res.data.preview
    }).catch(() => {})
  }
  routeDialogVisible.value = true
}

function handleRouteDialogClosed() {
  routeFormRef.value?.resetFields()
  editingRoute.value = null
}

function addStep() {
  routeForm.value.steps.push({ processId: null, remark: '' })
}

function removeStep(index) {
  routeForm.value.steps.splice(index, 1)
}

function handleProcessChange(row, val) {
  // processId is already set via v-model, nothing extra needed
}

function removeMaterial(id) {
  routeForm.value.materialIds = routeForm.value.materialIds.filter(mid => mid !== id)
}

async function saveRoute() {
  try {
    await routeFormRef.value.validate()
    const payload = {
      routeCode: routeForm.value.routeCode,
      routeName: routeForm.value.routeName,
      routeType: routeForm.value.routeType,
      version: routeForm.value.version,
      description: routeForm.value.description,
      status: routeForm.value.status,
      items: routeForm.value.steps
        .filter(s => s.processId)
        .map((s, idx) => ({ seq: idx + 1, processId: s.processId, remark: s.remark || '' })),
      materials: routeForm.value.materialIds.map(id => ({ materialId: id }))
    }
    if (editingRoute.value) {
      await updateProcessRoute(editingRoute.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createProcessRoute(payload)
      ElMessage.success('添加成功')
    }
    routeDialogVisible.value = false
    await fetchRouteList()
    if (selectedRoute.value) {
      fetchRouteDetail(selectedRoute.value.id)
    }
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

// ——— 删除 ———

async function handleDeleteRoute(row) {
  try {
    await ElMessageBox.confirm(`确定删除工艺路线「${row.routeName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteProcessRoute(row.id)
    ElMessage.success('删除成功')
    if (selectedRoute.value?.id === row.id) {
      selectedRoute.value = null
      routeDetail.value = { steps: [], materials: [] }
    }
    await fetchRouteList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 导入导出 ———

const importVisible = ref(false)
const exportVisible = ref(false)

const importColumns = [
  { key: 'routeCode', label: '路线编码', required: true, example: 'RT-001', width: 14 },
  { key: 'routeName', label: '路线名称', required: true, example: '标准加工路线', width: 16 },
  { key: 'routeType', label: '路线类型', example: '标准路线', width: 12, note: '标准路线/试制路线' },
  { key: 'version', label: '版本', example: 'V1.0', width: 10, note: '默认V1.0' },
  { key: 'description', label: '描述', example: '', width: 20 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const exportFields = [
  { key: 'routeCode', label: '路线编码', width: 14 },
  { key: 'routeName', label: '路线名称', width: 16 },
  { key: 'routeType', label: '路线类型', width: 12 },
  { key: 'version', label: '版本', width: 10 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleImportSuccess() {
  fetchRouteList()
}

function handleRouteCommand(command) {
  if (command === 'import') importVisible.value = true
  if (command === 'export') exportVisible.value = true
}

async function handleExport({ scope, fields }) {
  await runDialogExport({
    scope,
    fields,
    allFields: exportFields,
    currentRows: routeList.value,
    fetchAll: async () => routeList.value,
    fileName: '工艺路线'
  })
}

// ——— 通用 ———

function refreshAll() {
  resetSearch()
}

onMounted(() => {
  fetchRouteList()
  fetchProcesses()
  fetchMaterials()
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

.panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-top: 0;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}

/* ——— 工序流程卡片区 ——— */
.flow-area {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
}

.flow-card {
  position: relative;
  min-width: 160px;
  max-width: 220px;
  padding: 16px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: var(--shadow-sm);
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 8px;
    line-height: 1.4;
  }

  &__code {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  &__info {
    font-size: 12px;
    color: var(--text-regular);
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__label {
    color: var(--text-light);
    flex-shrink: 0;

    &::after {
      content: ':';
    }
  }

  &__badge {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  &__attachments {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-lighter);
  }

  &__no-attachment {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-lighter);
    font-size: 11px;
    color: var(--text-light);
  }
}

.flow-seq {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.flow-arrow {
  font-size: 20px;
  color: var(--text-light);
  flex-shrink: 0;
}

/* ——— 关联物料 ——— */
.material-section {
  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

/* ——— 流程卡片附件弹窗 ——— */
.flow-popover-list {
  max-height: 200px;
  overflow-y: auto;
}

.flow-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
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

    &:hover {
      opacity: 0.8;
    }
  }
}

/* ——— 弹窗内物料区域 ——— */
.dialog-material-section {
  .dialog-material-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }
}
</style>
