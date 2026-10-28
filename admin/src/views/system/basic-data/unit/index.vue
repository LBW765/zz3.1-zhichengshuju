<template>
  <div class="page-shell">
    <PageHeader title="计量单位" description="管理单位组与计量单位，维护换算关系" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">单位组名称</span>
            <el-input v-model="search.groupName" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">单位组编码</span>
            <el-input v-model="search.groupCode" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">单位名称</span>
            <el-input v-model="search.unitName" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">单位符号</span>
            <el-input v-model="search.unitCode" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <div class="split-panel page-shell__section">
      <!-- 左侧：单位组列表 -->
      <div class="split-panel__left">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">单位组</span>
              <span class="panel-header__actions">
                <el-button type="primary" :icon="Plus" size="small" circle title="新增单位组" @click="showGroupDialog()" />
                <el-dropdown trigger="click" @command="handleGroupCommand">
                  <el-button :icon="MoreFilled" size="small" circle title="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="import" :icon="Upload">导入单位组</el-dropdown-item>
                      <el-dropdown-item command="export" :icon="Download">导出单位组</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
          <el-table
            ref="groupTableRef"
            :data="groupList"
            v-loading="groupLoading"
            highlight-current-row
            size="small"
            @current-change="handleGroupSelect"
          >
            <el-table-column prop="groupName" label="组名" min-width="80" show-overflow-tooltip />
            <el-table-column prop="groupCode" label="编码" width="90" show-overflow-tooltip />
            <el-table-column label="状态" width="60" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="left">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" link size="small" @click.stop="showGroupDialog(row)">编辑</el-button>
                  <el-button type="danger" link size="small" @click.stop="handleDeleteGroup(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无单位组" :image-size="60" />
            </template>
          </el-table>
        </el-card>
      </div>

      <!-- 右侧：计量单位列表 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ rightPanelTitle }}</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="unitImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Download" size="small" @click="unitExportVisible = true">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
                <el-button type="primary" text :icon="Plus" size="small" :disabled="!selectedGroup" @click="showUnitDialog()">新增</el-button>
              </span>
            </div>
          </template>

          <div class="table-shell">
            <el-table :data="displayUnitList" v-loading="unitLoading" stripe size="small" :fit="false" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="45" />
              <el-table-column prop="unitName" label="单位名称" min-width="100" show-overflow-tooltip />
              <el-table-column prop="unitCode" label="单位符号" min-width="90" show-overflow-tooltip />
              <el-table-column label="基准" width="70" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.isBaseUnit" type="warning" size="small">基准</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="conversionRate" label="换算率" width="100" />
              <el-table-column prop="precisionNum" label="精度" width="70" align="center" />
              <el-table-column prop="sort" label="排序" width="70" align="center" />
              <el-table-column label="状态" width="70" align="center">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.status"
                    :active-value="1"
                    :inactive-value="0"
                    size="small"
                    @change="(val) => handleUnitStatusChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right" align="left">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" link size="small" @click="showUnitDialog(row)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="handleDeleteUnit(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty :description="isSearchMode ? '无匹配结果' : (selectedGroup ? '暂无计量单位' : '请先选择左侧单位组')" :image-size="60" />
              </template>
            </el-table>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 单位组弹窗 -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="editingGroup ? '编辑单位组' : '新增单位组'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleGroupDialogClosed"
    >
      <el-form ref="groupFormRef" :model="groupForm" :rules="groupRules" label-width="100px">
        <el-form-item label="组名称" prop="groupName">
          <el-input v-model="groupForm.groupName" placeholder="请输入单位组名称" />
        </el-form-item>
        <el-form-item label="组编码" prop="groupCode">
          <el-input v-model="groupForm.groupCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingGroup" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="groupForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="groupForm.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 计量单位弹窗 -->
    <el-dialog
      v-model="unitDialogVisible"
      :title="editingUnit ? '编辑计量单位' : '新增计量单位'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleUnitDialogClosed"
    >
      <el-form ref="unitFormRef" :model="unitForm" :rules="unitRules" label-width="100px">
        <el-form-item label="单位名称" prop="unitName">
          <el-input v-model="unitForm.unitName" placeholder="请输入单位名称（如 千克）" />
        </el-form-item>
        <el-form-item label="单位符号" prop="unitCode">
          <el-input v-model="unitForm.unitCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingUnit" />
        </el-form-item>
        <el-form-item label="基准单位">
          <el-switch v-model="unitForm.isBaseUnit" :active-value="1" :inactive-value="0" />
          <span class="form-tip">同一组仅允许一个基准单位</span>
        </el-form-item>
        <el-form-item v-if="!unitForm.isBaseUnit" label="换算率" prop="conversionRate">
          <el-input-number v-model="unitForm.conversionRate" :min="0" :precision="6" :controls="false" style="width: 100%" placeholder="1 本单位 = ? 基准单位" />
        </el-form-item>
        <el-form-item label="精度" prop="precisionNum">
          <el-input-number v-model="unitForm.precisionNum" :min="0" :max="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="unitForm.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="unitForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="unitForm.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="unitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUnit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 单位组导入 -->
    <ImportDialog
      v-model="groupImportVisible"
      title="导入单位组"
      :columns="groupImportColumns"
      template-file-name="单位组导入模板"
      :import-fn="importUnitGroup"
      @success="handleGroupImportSuccess"
    />

    <!-- 计量单位导入 -->
    <ImportDialog
      v-model="unitImportVisible"
      title="导入计量单位"
      :columns="unitImportColumns"
      template-file-name="计量单位导入模板"
      :import-fn="importUnit"
      @success="handleUnitImportSuccess"
    />

    <ExportDialog
      v-model="groupExportVisible"
      title="导出单位组"
      :fields="groupExportFields"
      :allow-selected="false"
      :current-page-count="groupList.length"
      :total-count="groupList.length"
      :export-fn="handleExportGroup"
    />

    <ExportDialog
      v-model="unitExportVisible"
      title="导出计量单位"
      :fields="unitExportFields"
      :selected-count="selectedRows.length"
      :current-page-count="displayUnitList.length"
      :total-count="displayUnitList.length"
      :export-fn="handleExportUnit"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, MoreFilled, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { runDialogExport } from '@/utils/exportDialog'
import {
  getUnitGroupList, createUnitGroup, updateUnitGroup, deleteUnitGroup,
  getUnitList, createUnit, updateUnit, updateUnitStatus, deleteUnit,
  importUnitGroup, importUnit
} from '@/api/basicData'
import { getNextCode } from '@/api/codeRule'

// ——— 搜索 ———

const search = ref({ groupName: '', groupCode: '', unitName: '', unitCode: '' })
const isSearchMode = ref(false)
const searchResults = ref([])

function hasSearchParams() {
  return !!(search.value.groupName || search.value.groupCode || search.value.unitName || search.value.unitCode)
}

async function handleSearch() {
  if (!hasSearchParams()) {
    ElMessage.warning('请至少输入一个搜索条件')
    return
  }
  isSearchMode.value = true
  unitLoading.value = true
  try {
    const params = {}
    if (search.value.groupName) params.groupName = search.value.groupName
    if (search.value.groupCode) params.groupCode = search.value.groupCode
    if (search.value.unitName) params.unitName = search.value.unitName
    if (search.value.unitCode) params.unitCode = search.value.unitCode
    const res = await getUnitList(params)
    searchResults.value = res.data.list || []

    if (searchResults.value.length) {
      const firstGroupId = searchResults.value[0].groupId
      const target = groupList.value.find(g => g.id === firstGroupId)
      if (target) {
        await nextTick()
        groupTableRef.value?.setCurrentRow(target)
        selectedGroup.value = target
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    unitLoading.value = false
  }
}

function resetSearch() {
  search.value = { groupName: '', groupCode: '', unitName: '', unitCode: '' }
  isSearchMode.value = false
  searchResults.value = []
  selectedGroup.value = null
  groupTableRef.value?.setCurrentRow()
}

const displayUnitList = computed(() => {
  if (isSearchMode.value) {
    if (!selectedGroup.value) return searchResults.value
    return searchResults.value.filter(u => u.groupId === selectedGroup.value.id)
  }
  return unitList.value
})

const rightPanelTitle = computed(() => {
  if (isSearchMode.value) {
    const total = searchResults.value.length
    const shown = displayUnitList.value.length
    if (selectedGroup.value) {
      return `${selectedGroup.value.groupName} — 搜索结果（${shown}/${total}）`
    }
    return `搜索结果（${total} 条）`
  }
  return selectedGroup.value ? `${selectedGroup.value.groupName} — 计量单位` : '计量单位'
})

// ——— 单位组 ———

const groupTableRef = ref(null)
const groupList = ref([])
const groupLoading = ref(false)
const selectedGroup = ref(null)

async function fetchGroupList() {
  groupLoading.value = true
  try {
    const res = await getUnitGroupList()
    groupList.value = res.data.list || []
    if (selectedGroup.value) {
      const still = groupList.value.find(g => g.id === selectedGroup.value.id)
      if (still) {
        await nextTick()
        groupTableRef.value?.setCurrentRow(still)
        selectedGroup.value = still
      } else {
        selectedGroup.value = null
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    groupLoading.value = false
  }
}

function handleGroupSelect(row) {
  selectedGroup.value = row || null
  if (!isSearchMode.value) {
    fetchUnitList()
  }
}

// 单位组弹窗
const groupDialogVisible = ref(false)
const editingGroup = ref(null)
const groupFormRef = ref(null)

function defaultGroupForm() {
  return { groupName: '', groupCode: '', status: 1, remark: '' }
}
const groupForm = ref(defaultGroupForm())

const groupRules = {
  groupName: [{ required: true, message: '请输入单位组名称', trigger: 'blur' }],
  groupCode: [{ required: true, message: '请输入单位组编码', trigger: 'blur' }]
}

function showGroupDialog(row) {
  editingGroup.value = row || null
  if (row) {
    groupForm.value = { groupName: row.groupName, groupCode: row.groupCode, status: row.status, remark: row.remark || '' }
  } else {
    groupForm.value = defaultGroupForm()
    getNextCode('unit_group').then(res => {
      if (res.data?.preview) groupForm.value.groupCode = res.data.preview
    }).catch(() => {})
  }
  groupDialogVisible.value = true
}

function handleGroupDialogClosed() {
  groupFormRef.value?.resetFields()
  editingGroup.value = null
}

async function saveGroup() {
  try {
    await groupFormRef.value.validate()
    if (editingGroup.value) {
      await updateUnitGroup(editingGroup.value.id, groupForm.value)
      ElMessage.success('更新成功')
    } else {
      await createUnitGroup(groupForm.value)
      ElMessage.success('添加成功')
    }
    groupDialogVisible.value = false
    await fetchGroupList()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleDeleteGroup(row) {
  try {
    await ElMessageBox.confirm(`确定删除单位组「${row.groupName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteUnitGroup(row.id)
    ElMessage.success('删除成功')
    if (selectedGroup.value?.id === row.id) selectedGroup.value = null
    await fetchGroupList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 计量单位 ———

const unitList = ref([])
const unitLoading = ref(false)

async function fetchUnitList() {
  if (!selectedGroup.value) {
    unitList.value = []
    return
  }
  unitLoading.value = true
  try {
    const res = await getUnitList({ groupId: selectedGroup.value.id })
    unitList.value = res.data.list || []
  } catch (e) {
    console.error(e)
  } finally {
    unitLoading.value = false
  }
}

// 计量单位弹窗
const unitDialogVisible = ref(false)
const editingUnit = ref(null)
const unitFormRef = ref(null)

function defaultUnitForm() {
  return { unitName: '', unitCode: '', isBaseUnit: 0, conversionRate: 1, precisionNum: 2, sort: 0, status: 1, remark: '' }
}
const unitForm = ref(defaultUnitForm())

const unitRules = {
  unitName: [{ required: true, message: '请输入单位名称', trigger: 'blur' }],
  unitCode: [{ required: true, message: '请输入单位符号', trigger: 'blur' }],
  conversionRate: [{ required: true, message: '请输入换算率', trigger: 'blur' }]
}

function showUnitDialog(row) {
  editingUnit.value = row || null
  if (row) {
    unitForm.value = {
      unitName: row.unitName, unitCode: row.unitCode, isBaseUnit: row.isBaseUnit,
      conversionRate: row.conversionRate, precisionNum: row.precisionNum,
      sort: row.sort, status: row.status, remark: row.remark || ''
    }
  } else {
    unitForm.value = defaultUnitForm()
    getNextCode('unit').then(res => {
      if (res.data?.preview) unitForm.value.unitCode = res.data.preview
    }).catch(() => {})
  }
  unitDialogVisible.value = true
}

function handleUnitDialogClosed() {
  unitFormRef.value?.resetFields()
  editingUnit.value = null
}

async function saveUnit() {
  try {
    await unitFormRef.value.validate()
    const payload = { ...unitForm.value, groupId: selectedGroup.value.id }
    if (editingUnit.value) {
      await updateUnit(editingUnit.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createUnit(payload)
      ElMessage.success('添加成功')
    }
    unitDialogVisible.value = false
    if (isSearchMode.value) {
      await handleSearch()
    } else {
      await fetchUnitList()
    }
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleUnitStatusChange(row, val) {
  try {
    await updateUnitStatus(row.id, { status: val })
    ElMessage.success(val ? '已启用' : '已停用')
  } catch (e) {
    row.status = val ? 0 : 1
  }
}

async function handleDeleteUnit(row) {
  try {
    await ElMessageBox.confirm(`确定删除计量单位「${row.unitName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteUnit(row.id)
    ElMessage.success('删除成功')
    if (isSearchMode.value) {
      await handleSearch()
    } else {
      await fetchUnitList()
    }
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 导入导出 ———

const groupImportVisible = ref(false)
const unitImportVisible = ref(false)
const groupExportVisible = ref(false)
const unitExportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const groupImportColumns = [
  { key: 'groupCode', label: '组编码', required: true, example: 'WEIGHT', width: 16 },
  { key: 'groupName', label: '组名称', required: true, example: '重量', width: 16 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const groupExportFields = [
  { key: 'groupCode', label: '组编码', width: 16 },
  { key: 'groupName', label: '组名称', width: 16 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20, default: false },
  { key: 'createdAt', label: '创建时间', width: 20, default: false }
]

const unitImportColumns = [
  { key: 'unitCode', label: '单位符号', required: true, example: 'kg', width: 12 },
  { key: 'unitName', label: '单位名称', required: true, example: '千克', width: 14 },
  { key: 'groupName', label: '单位组名称', required: true, example: '重量', width: 14, note: '填写单位组名称' },
  { key: 'isBaseUnit', label: '基准单位', example: '否', width: 10, note: '是/否，默认否' },
  { key: 'conversionRate', label: '换算率', example: '1', width: 10 },
  { key: 'precision', label: '小数精度', example: '2', width: 10, note: '默认2' },
  { key: 'sort', label: '排序', example: '0', width: 8 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const unitExportFields = [
  { key: 'unitCode', label: '单位符号', width: 12 },
  { key: 'unitName', label: '单位名称', width: 14 },
  { key: 'groupName', label: '单位组名称', width: 14 },
  { key: 'isBaseUnit', label: '基准单位', width: 10, formatter: (v) => v === 1 ? '是' : '否' },
  { key: 'conversionRate', label: '换算率', width: 10 },
  { key: 'precisionNum', label: '小数精度', width: 10 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleGroupCommand(command) {
  if (command === 'import') groupImportVisible.value = true
  if (command === 'export') groupExportVisible.value = true
}

function handleGroupImportSuccess() {
  fetchGroupList()
}

function handleUnitImportSuccess() {
  if (isSearchMode.value) {
    handleSearch()
  } else {
    fetchUnitList()
  }
}

async function handleExportGroup({ scope, fields }) {
  await runDialogExport({
    scope,
    fields,
    allFields: groupExportFields,
    currentRows: groupList.value,
    fetchAll: async () => groupList.value,
    fileName: '单位组'
  })
}

async function handleExportUnit({ scope, fields }) {
  await runDialogExport({
    scope,
    fields,
    allFields: unitExportFields,
    selectedRows: selectedRows.value,
    currentRows: displayUnitList.value,
    fetchAll: async () => displayUnitList.value,
    fileName: '计量单位'
  })
}

// ——— 通用 ———

function refreshAll() {
  resetSearch()
  fetchGroupList()
}

onMounted(() => {
  fetchGroupList()
})
</script>

<style lang="scss" scoped>
.panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
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

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

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
</style>
