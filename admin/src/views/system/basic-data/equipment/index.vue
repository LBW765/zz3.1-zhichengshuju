<template>
  <div class="page-shell">
    <PageHeader title="设备档案" description="管理设备分类与设备基础档案，含折旧、维保信息" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编码/名称</span>
            <el-input v-model="search.keyword" placeholder="请输入编码、名称或型号" clearable style="width: 220px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">状态</span>
            <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
              <el-option label="运行" :value="1" />
              <el-option label="闲置" :value="2" />
              <el-option label="维修中" :value="3" />
              <el-option label="报废" :value="4" />
              <el-option label="停用" :value="0" />
            </el-select>
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <div class="split-panel page-shell__section">
      <!-- 左侧：分类树 -->
      <div class="split-panel__left" style="width: 280px; min-width: 280px;">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">设备分类</span>
              <span class="panel-header__actions">
                <el-button type="primary" :icon="Plus" size="small" circle title="新增分类" @click="showCategoryDialog()" />
                <el-dropdown trigger="click" @command="handleCategoryCommand">
                  <el-button :icon="MoreFilled" size="small" circle title="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="import" :icon="Upload">导入分类</el-dropdown-item>
                      <el-dropdown-item command="export" :icon="Download">导出分类</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
          <div class="tree-wrapper">
            <div
              class="tree-virtual-root"
              :class="{ 'is-active': !selectedCategoryId }"
              @click="handleSelectAllCategory"
            >
              <el-icon><Folder /></el-icon>
              <span>全部设备</span>
            </div>
            <el-tree
              ref="treeRef"
              :data="categoryTree"
              node-key="id"
              highlight-current
              default-expand-all
              :expand-on-click-node="false"
              @node-click="handleCategoryClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node">
                  <span class="tree-node__label">{{ data.name }}</span>
                  <span class="tree-node__actions">
                    <el-button type="primary" link size="small" :icon="Plus" @click.stop="showCategoryDialog(null, data.id)" />
                    <el-button type="primary" link size="small" :icon="EditPen" @click.stop="showCategoryDialog(data)" />
                    <el-button type="danger" link size="small" :icon="Delete" @click.stop="handleDeleteCategory(data)" />
                  </span>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>

      <!-- 右侧：设备列表 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ selectedCategoryId ? '分类筛选中' : '全部设备' }}</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="dataImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Download" size="small" @click="dataExportVisible = true">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
                <el-button type="primary" text :icon="Plus" size="small" @click="showEquipDialog()">新增</el-button>
              </span>
            </div>
          </template>
          <div class="table-shell" v-loading="tableLoading">
            <el-table :data="tableData" :fit="false" size="small" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="45" />
              <el-table-column prop="equipmentCode" label="编码" width="120" show-overflow-tooltip />
              <el-table-column prop="equipmentName" label="设备名称" min-width="180" show-overflow-tooltip />
              <el-table-column prop="model" label="型号" width="120" show-overflow-tooltip />
              <el-table-column prop="workshopName" label="所属车间" width="100" show-overflow-tooltip />
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="warrantyDate" label="保修到期" width="110" />
              <el-table-column label="操作" width="140" align="left" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" link size="small" @click="showEquipDialog(row)">编辑</el-button>
                    <el-button type="warning" link size="small" @click="showStatusDialog(row)">状态</el-button>
                    <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 30, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="fetchList"
              @current-change="fetchList"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="catDialogVisible" :title="editingCat ? '编辑分类' : '新增分类'" width="500px" :close-on-click-modal="false" @closed="handleCatDialogClosed">
      <el-form ref="catFormRef" :model="catForm" :rules="catRules" label-width="100px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="catForm.categoryName" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="categoryCode">
          <el-input v-model="catForm.categoryCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingCat" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="catForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCat">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设备新增/编辑弹窗 -->
    <el-dialog v-model="equipDialogVisible" :title="editingEquip ? '编辑设备' : '新增设备'" width="760px" :close-on-click-modal="false" @closed="handleEquipDialogClosed">
      <el-form ref="equipFormRef" :model="equipForm" :rules="equipRules" label-width="100px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编码" prop="equipmentCode">
              <el-input v-model="equipForm.equipmentCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingEquip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="equipmentName">
              <el-input v-model="equipForm.equipmentName" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属分类">
              <el-tree-select v-model="equipForm.categoryId" :data="categoryTree" :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="请选择" clearable check-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="equipForm.model" placeholder="设备型号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="制造商">
              <el-input v-model="equipForm.manufacturer" placeholder="制造商" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出厂编号">
              <el-input v-model="equipForm.serialNo" placeholder="出厂编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属车间">
              <el-select v-model="equipForm.workshopId" placeholder="请选择" clearable style="width: 100%" @change="handleWorkshopChange">
                <el-option v-for="w in workshopOptions" :key="w.id" :label="w.workshopName" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属产线">
              <el-select v-model="equipForm.lineId" placeholder="请先选择车间" clearable style="width: 100%" :disabled="!equipForm.workshopId">
                <el-option v-for="l in lineOptions" :key="l.id" :label="l.lineName" :value="l.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">财务信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="原值(元)">
              <el-input-number v-model="equipForm.originalValue" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="残值(元)">
              <el-input-number v-model="equipForm.residualValue" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="折旧方式">
              <el-select v-model="equipForm.depreciationMethod" placeholder="请选择" clearable style="width: 100%">
                <el-option label="直线法" value="直线法" />
                <el-option label="双倍余额递减法" value="双倍余额递减法" />
                <el-option label="年数总和法" value="年数总和法" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="折旧年限">
              <el-input-number v-model="equipForm.depreciationYears" :min="1" :max="50" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="editingEquip">
          <el-col :span="8">
            <el-form-item label="年折旧额">
              <el-input :model-value="editingEquip?.annualDepreciation ?? '-'" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="累计折旧">
              <el-input :model-value="editingEquip?.accumulatedDepreciation ?? '-'" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="账面净值">
              <el-input :model-value="editingEquip?.netBookValue ?? '-'" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">日期信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker v-model="equipForm.purchaseDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投产日期">
              <el-date-picker v-model="equipForm.commissioningDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保修到期">
              <el-date-picker v-model="equipForm.warrantyDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设计寿命(年)">
              <el-input-number v-model="equipForm.serviceLife" :min="1" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">技术参数</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="额定功率">
              <el-input v-model="equipForm.ratedPower" placeholder="如 22kW" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="精度等级">
              <el-input v-model="equipForm.precisionLevel" placeholder="如 0.005mm" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="外形尺寸">
              <el-input v-model="equipForm.dimensions" placeholder="长×宽×高mm" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备重量(kg)">
              <el-input-number v-model="equipForm.weightKg" :min="0" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">维保信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="保养周期(天)">
              <el-input-number v-model="equipForm.maintenanceCycle" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="上次保养">
              <el-date-picker v-model="equipForm.lastMaintenanceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="下次保养">
              <el-input :model-value="editingEquip?.nextMaintenanceDate || '自动计算'" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="equipForm.status" style="width: 100%">
                <el-option label="运行" :value="1" />
                <el-option label="闲置" :value="2" />
                <el-option label="维修中" :value="3" />
                <el-option label="报废" :value="4" />
                <el-option label="停用" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="equipForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="equipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEquip">保存</el-button>
      </template>
    </el-dialog>

    <!-- 状态切换弹窗 -->
    <el-dialog v-model="statusDialogVisible" title="切换设备状态" width="400px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="当前状态">
          <el-tag :type="statusTagType(statusRow?.status)" size="small">{{ statusLabel(statusRow?.status) }}</el-tag>
        </el-form-item>
        <el-form-item label="新状态">
          <el-select v-model="newStatus" style="width: 100%">
            <el-option label="运行" :value="1" />
            <el-option label="闲置" :value="2" />
            <el-option label="维修中" :value="3" />
            <el-option label="报废" :value="4" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusChange">确认</el-button>
      </template>
    </el-dialog>

    <!-- 设备分类导入 -->
    <ImportDialog
      v-model="categoryImportVisible"
      title="导入设备分类"
      :columns="categoryImportColumns"
      template-file-name="设备分类导入模板"
      :import-fn="importEquipmentCategory"
      @success="handleCategoryImportSuccess"
    />

    <!-- 设备档案导入 -->
    <ImportDialog
      v-model="dataImportVisible"
      title="导入设备档案"
      :columns="dataImportColumns"
      template-file-name="设备档案导入模板"
      :import-fn="importEquipment"
      @success="handleDataImportSuccess"
    />

    <ExportDialog
      v-model="categoryExportVisible"
      title="导出设备分类"
      :fields="categoryExportFields"
      :allow-selected="false"
      :current-page-count="categoryList.length"
      :total-count="categoryList.length"
      :export-fn="handleExportCategory"
    />

    <ExportDialog
      v-model="dataExportVisible"
      title="导出设备档案"
      :fields="dataExportFields"
      :selected-count="selectedRows.length"
      :current-page-count="tableData.length"
      :total-count="total"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, EditPen, Delete, Folder, Upload, Download, MoreFilled } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { fetchAllByPage, runDialogExport } from '@/utils/exportDialog'
import {
  getEquipmentCategoryList, createEquipmentCategory, updateEquipmentCategory, deleteEquipmentCategory,
  getEquipmentList, getEquipmentDetail, createEquipment, updateEquipment, updateEquipmentStatus, deleteEquipment,
  getWorkshopList, getProductionLines,
  importEquipmentCategory, importEquipment
} from '@/api/basicData'
import { getNextCode } from '@/api/codeRule'

// ========== 分类树 ==========

const treeRef = ref(null)
const categoryList = ref([])
const selectedCategoryId = ref(null)

const categoryTree = computed(() => buildTree(categoryList.value))

function buildTree(list, parentId = null) {
  return list
    .filter(item => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map(item => ({
      id: item.id, name: item.categoryName, code: item.categoryCode,
      sort: item.sort, remark: item.remark, parentId: item.parentId,
      children: buildTree(list, item.id)
    }))
}

async function fetchCategories() {
  try {
    const res = await getEquipmentCategoryList()
    categoryList.value = res.data.list || []
  } catch (e) { console.error(e) }
}

function handleSelectAllCategory() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  page.value = 1
  fetchList()
}

function handleCategoryClick(data) {
  selectedCategoryId.value = data.id
  page.value = 1
  fetchList()
}

// ========== 分类弹窗 ==========

const catDialogVisible = ref(false)
const editingCat = ref(null)
const catFormRef = ref(null)
const catForm = ref({ categoryName: '', categoryCode: '', sort: 0, remark: '', parentId: null })
const catRules = {
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  categoryCode: [{ required: true, message: '请输入分类编码', trigger: 'blur' }]
}

function showCategoryDialog(data, parentId) {
  editingCat.value = data || null
  if (data) {
    catForm.value = { categoryName: data.name, categoryCode: data.code, sort: data.sort || 0, remark: data.remark || '', parentId: data.parentId }
  } else {
    catForm.value = { categoryName: '', categoryCode: '', sort: 0, remark: '', parentId: parentId || null }
    getNextCode('equipment_category').then(res => {
      if (res.data?.preview) catForm.value.categoryCode = res.data.preview
    }).catch(() => {})
  }
  catDialogVisible.value = true
}

function handleCatDialogClosed() {
  catFormRef.value?.resetFields()
  editingCat.value = null
}

async function saveCat() {
  try {
    await catFormRef.value.validate()
    if (editingCat.value) {
      await updateEquipmentCategory(editingCat.value.id, catForm.value)
      ElMessage.success('更新成功')
    } else {
      await createEquipmentCategory(catForm.value)
      ElMessage.success('添加成功')
    }
    catDialogVisible.value = false
    await fetchCategories()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleDeleteCategory(data) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', { type: 'warning' })
    await deleteEquipmentCategory(data.id)
    ElMessage.success('删除成功')
    if (selectedCategoryId.value === data.id) selectedCategoryId.value = null
    await fetchCategories()
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ========== 车间/产线选项 ==========

const workshopOptions = ref([])
const lineOptions = ref([])

async function fetchWorkshops() {
  try {
    const res = await getWorkshopList()
    workshopOptions.value = res.data || []
  } catch (e) { console.error(e) }
}

async function handleWorkshopChange(val) {
  equipForm.value.lineId = null
  lineOptions.value = []
  if (val) {
    try {
      const res = await getProductionLines(val)
      lineOptions.value = res.data || []
    } catch (e) { console.error(e) }
  }
}

// ========== 设备列表 ==========

const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const search = ref({ keyword: '', status: '' })

async function fetchList() {
  tableLoading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.status !== '' && search.value.status !== null) params.status = search.value.status
    if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value

    const res = await getEquipmentList(params)
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function handleSearch() { page.value = 1; fetchList() }
function resetSearch() { search.value = { keyword: '', status: '' }; page.value = 1; fetchList() }
function refreshAll() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  resetSearch()
  fetchCategories()
}

// ========== 设备弹窗 ==========

const equipDialogVisible = ref(false)
const editingEquip = ref(null)
const equipFormRef = ref(null)

function defaultForm() {
  return {
    equipmentCode: '', equipmentName: '', categoryId: selectedCategoryId.value || null,
    model: '', manufacturer: '', serialNo: '',
    supplierId: null, workshopId: null, lineId: null,
    originalValue: null, residualValue: null, depreciationMethod: '', depreciationYears: null,
    purchaseDate: '', commissioningDate: '', warrantyDate: '', serviceLife: null,
    ratedPower: '', precisionLevel: '', dimensions: '', weightKg: null,
    maintenanceCycle: null, lastMaintenanceDate: '',
    status: 1, remark: ''
  }
}

const equipForm = ref(defaultForm())
const equipRules = {
  equipmentName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }]
}

async function showEquipDialog(row) {
  editingEquip.value = row || null
  if (row) {
    try {
      const res = await getEquipmentDetail(row.id)
      const d = res.data || {}
      editingEquip.value = d
      equipForm.value = {
        equipmentCode: d.equipmentCode || '', equipmentName: d.equipmentName || '',
        categoryId: d.categoryId, model: d.model || '',
        manufacturer: d.manufacturer || '', serialNo: d.serialNo || '',
        supplierId: d.supplierId, workshopId: d.workshopId, lineId: d.lineId,
        originalValue: d.originalValue, residualValue: d.residualValue,
        depreciationMethod: d.depreciationMethod || '', depreciationYears: d.depreciationYears,
        purchaseDate: d.purchaseDate || '', commissioningDate: d.commissioningDate || '',
        warrantyDate: d.warrantyDate || '', serviceLife: d.serviceLife,
        ratedPower: d.ratedPower || '', precisionLevel: d.precisionLevel || '',
        dimensions: d.dimensions || '', weightKg: d.weightKg,
        maintenanceCycle: d.maintenanceCycle, lastMaintenanceDate: d.lastMaintenanceDate || '',
        status: d.status ?? 1, remark: d.remark || ''
      }
      if (d.workshopId) {
        const lRes = await getProductionLines(d.workshopId)
        lineOptions.value = lRes.data || []
      }
    } catch (e) { console.error(e); equipForm.value = defaultForm() }
  } else {
    equipForm.value = defaultForm()
    lineOptions.value = []
    getNextCode('equipment').then(res => {
      if (res.data?.preview) equipForm.value.equipmentCode = res.data.preview
    }).catch(() => {})
  }
  equipDialogVisible.value = true
}

function handleEquipDialogClosed() {
  equipFormRef.value?.resetFields()
  editingEquip.value = null
}

async function saveEquip() {
  try {
    await equipFormRef.value.validate()
    if (editingEquip.value) {
      await updateEquipment(editingEquip.value.id, equipForm.value)
      ElMessage.success('更新成功')
    } else {
      await createEquipment(equipForm.value)
      ElMessage.success('添加成功')
    }
    equipDialogVisible.value = false
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

// ========== 状态切换 ==========

const statusDialogVisible = ref(false)
const statusRow = ref(null)
const newStatus = ref(1)

function showStatusDialog(row) {
  statusRow.value = row
  newStatus.value = row.status
  statusDialogVisible.value = true
}

async function confirmStatusChange() {
  try {
    await updateEquipmentStatus(statusRow.value.id, { status: newStatus.value })
    ElMessage.success('状态更新成功')
    statusDialogVisible.value = false
    fetchList()
  } catch (e) { console.error(e) }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除设备「${row.equipmentName}」吗？`, '提示', { type: 'warning' })
    await deleteEquipment(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

function statusLabel(s) {
  const map = { 1: '运行', 2: '闲置', 3: '维修中', 4: '报废', 0: '停用' }
  return map[s] ?? '-'
}

function statusTagType(s) {
  const map = { 1: 'success', 2: 'warning', 3: 'danger', 4: 'info', 0: 'info' }
  return map[s] || 'info'
}

// ========== 导入导出 ==========

const categoryImportVisible = ref(false)
const dataImportVisible = ref(false)
const categoryExportVisible = ref(false)
const dataExportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const categoryImportColumns = [
  { key: 'categoryCode', label: '分类编码', required: true, example: 'SB-C001', width: 16 },
  { key: 'categoryName', label: '分类名称', required: true, example: '数控设备', width: 16 },
  { key: 'parentCode', label: '上级分类编码', example: '', width: 18, note: '留空则为顶级分类' },
  { key: 'sort', label: '排序', example: '0', width: 10 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const categoryExportFields = [
  { key: 'categoryCode', label: '分类编码', width: 16 },
  { key: 'categoryName', label: '分类名称', width: 16 },
  { key: 'parentCode', label: '上级分类编码', width: 18 },
  { key: 'parentName', label: '上级分类名称', width: 18 },
  { key: 'sort', label: '排序', width: 10 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20, default: false },
  { key: 'createdAt', label: '创建时间', width: 20, default: false }
]

const dataImportColumns = [
  { key: 'equipmentCode', label: '设备编码', required: true, example: 'SB-001', width: 16 },
  { key: 'equipmentName', label: '设备名称', required: true, example: '数控车床', width: 18 },
  { key: 'categoryName', label: '设备分类名', example: '数控设备', width: 14, note: '填写分类名称' },
  { key: 'model', label: '型号', example: 'CK6136', width: 14 },
  { key: 'manufacturer', label: '制造商', example: '沈阳机床', width: 14 },
  { key: 'serialNo', label: '出厂编号', example: 'SN20240001', width: 16 },
  { key: 'supplierName', label: '供应商名称', example: '', width: 16, note: '填写供应商名称' },
  { key: 'workshopName', label: '车间名称', example: '', width: 14, note: '填写车间名称' },
  { key: 'originalValue', label: '原值(元)', example: '500000', width: 14 },
  { key: 'residualValue', label: '残值(元)', example: '50000', width: 14 },
  { key: 'depreciationMethod', label: '折旧方式', example: '直线法', width: 16, note: '直线法/双倍余额递减法/年数总和法' },
  { key: 'depreciationYears', label: '折旧年限', example: '10', width: 10 },
  { key: 'purchaseDate', label: '采购日期', example: '2024-01-01', width: 14 },
  { key: 'commissioningDate', label: '投产日期', example: '2024-02-01', width: 14 },
  { key: 'warrantyDate', label: '保修到期', example: '2026-01-01', width: 14 },
  { key: 'serviceLife', label: '设计寿命(年)', example: '15', width: 12 },
  { key: 'ratedPower', label: '额定功率', example: '22kW', width: 12 },
  { key: 'precisionLevel', label: '精度等级', example: '0.005mm', width: 12 },
  { key: 'dimensions', label: '外形尺寸', example: '2000×1000×1500mm', width: 20 },
  { key: 'weightKg', label: '设备重量(kg)', example: '3500', width: 14 },
  { key: 'maintenanceCycle', label: '保养周期(天)', example: '90', width: 14 },
  { key: 'lastMaintenanceDate', label: '上次保养日期', example: '2024-06-01', width: 14 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const dataExportFields = [
  { key: 'equipmentCode', label: '设备编码', width: 16 },
  { key: 'equipmentName', label: '设备名称', width: 18 },
  { key: 'categoryName', label: '设备分类', width: 14 },
  { key: 'model', label: '型号', width: 14 },
  { key: 'manufacturer', label: '制造商', width: 14 },
  { key: 'serialNo', label: '出厂编号', width: 16 },
  { key: 'supplierName', label: '供应商名称', width: 16 },
  { key: 'workshopName', label: '所属车间', width: 14 },
  { key: 'originalValue', label: '原值(元)', width: 14 },
  { key: 'residualValue', label: '残值(元)', width: 14 },
  { key: 'depreciationMethod', label: '折旧方式', width: 16 },
  { key: 'depreciationYears', label: '折旧年限', width: 10 },
  { key: 'purchaseDate', label: '采购日期', width: 14 },
  { key: 'commissioningDate', label: '投产日期', width: 14 },
  { key: 'warrantyDate', label: '保修到期', width: 14 },
  { key: 'serviceLife', label: '设计寿命(年)', width: 12 },
  { key: 'ratedPower', label: '额定功率', width: 12 },
  { key: 'precisionLevel', label: '精度等级', width: 12 },
  { key: 'dimensions', label: '外形尺寸', width: 20 },
  { key: 'weightKg', label: '设备重量(kg)', width: 14 },
  { key: 'maintenanceCycle', label: '保养周期(天)', width: 14 },
  { key: 'lastMaintenanceDate', label: '上次保养日期', width: 14 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => { const map = { 1: '运行', 2: '闲置', 3: '维修中', 4: '报废', 0: '停用' }; return map[v] ?? '-' } },
  { key: 'remark', label: '备注', width: 20 }
]

function handleCategoryCommand(command) {
  if (command === 'import') categoryImportVisible.value = true
  if (command === 'export') categoryExportVisible.value = true
}

function handleCategoryImportSuccess() {
  fetchCategories()
}

function handleDataImportSuccess() {
  fetchList()
}

async function handleExportCategory({ scope, fields }) {
  await runDialogExport({
    scope,
    fields,
    allFields: categoryExportFields,
    currentRows: categoryList.value,
    fetchAll: async () => categoryList.value,
    fileName: '设备分类'
  })
}

async function handleExport({ scope, fields }) {
  const filters = {}
  if (search.value.keyword) filters.keyword = search.value.keyword
  if (selectedCategoryId.value) filters.categoryId = selectedCategoryId.value

  await runDialogExport({
    scope,
    fields,
    allFields: dataExportFields,
    selectedRows: selectedRows.value,
    currentRows: tableData.value,
    fetchAll: () => fetchAllByPage(getEquipmentList, filters),
    fileName: '设备档案'
  })
}

onMounted(() => {
  fetchCategories()
  fetchWorkshops()
  fetchList()
})
</script>

<style lang="scss" scoped>
.split-panel {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.split-panel__left {
  flex-shrink: 0;
}

.split-panel__right {
  flex: 1;
  min-width: 0;
}

.panel-card {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.panel-header__title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tree-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.tree-virtual-root {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-regular);
  transition: background 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  &.is-active {
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 13px;
}

.tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node__actions {
  display: none;
  flex-shrink: 0;
}

.tree-node:hover .tree-node__actions {
  display: flex;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}

.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.search-bar__fields {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-bar__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-bar__label {
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
}

.search-bar__actions {
  display: flex;
  gap: 8px;
}
</style>
