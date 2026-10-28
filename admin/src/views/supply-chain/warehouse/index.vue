<template>
  <div class="page-shell">
    <PageHeader title="仓库管理" description="管理仓库、库区与库位信息" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入</el-button>
        <el-button :icon="Download" @click="handleExport">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编码/名称</span>
            <el-input v-model="search.keyword" placeholder="请输入编码或名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">状态</span>
            <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
              <el-option label="启用" :value="1" />
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

    <el-card shadow="never" class="page-card page-shell__section">
      <template #header>
        <div class="panel-header">
          <span class="panel-header__title">仓库列表</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showWarehouseDialog()">新增仓库</el-button>
        </div>
      </template>
      <div class="table-shell" v-loading="tableLoading">
        <el-table :data="tableData" :fit="false" size="small" @row-click="openDetail" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="45" />
          <el-table-column prop="warehouseCode" label="仓库编码" width="110" show-overflow-tooltip />
          <el-table-column prop="warehouseName" label="仓库名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="warehouseType" label="类型" width="100" show-overflow-tooltip />
          <el-table-column prop="manager" label="负责人" width="90" />
          <el-table-column prop="temperatureReq" label="温度要求" width="90" align="center">
            <template #default="{ row }">{{ row.temperatureReq || '-' }}</template>
          </el-table-column>
          <el-table-column label="多层级" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enableLocation ? 'success' : 'info'" size="small">{{ row.enableLocation ? '开启' : '关闭' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="库区/库位" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.enableLocation">{{ row.areaCount }} / {{ row.locationCount }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="left" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="primary" link size="small" @click.stop="showWarehouseDialog(row)">编辑</el-button>
                <el-button :type="row.status ? 'warning' : 'success'" link size="small" @click.stop="handleToggleStatus(row)">{{ row.status ? '停用' : '启用' }}</el-button>
                <el-button type="danger" link size="small" @click.stop="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 新增/编辑仓库弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingWarehouse ? '编辑仓库' : '新增仓库'" width="600px" :close-on-click-modal="false" @closed="handleDialogClosed">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仓库编码" prop="warehouseCode">
              <el-input v-model="form.warehouseCode" placeholder="如 WH-004" :disabled="!!editingWarehouse" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库名称" prop="warehouseName">
              <el-input v-model="form.warehouseName" placeholder="请输入仓库名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仓库类型">
              <el-select v-model="form.warehouseType" placeholder="请选择" clearable style="width: 100%">
                <el-option label="原材料仓" value="原材料仓" />
                <el-option label="成品仓" value="成品仓" />
                <el-option label="半成品仓" value="半成品仓" />
                <el-option label="退货仓" value="退货仓" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积(m²)">
              <el-input-number v-model="form.area" :min="0" placeholder="仓库面积" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select v-model="form.managerUserId" filterable clearable placeholder="请选择负责人" style="width: 100%" @change="handleManagerChange">
                <el-option
                  v-for="employee in employeeOptions"
                  :key="employee.id"
                  :label="formatEmployeeOptionLabel(employee)"
                  :value="employee.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入仓库地址" />
        </el-form-item>

        <el-divider content-position="left">环境要求</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="温度要求">
              <el-select v-model="form.temperatureReq" placeholder="请选择" clearable style="width: 100%">
                <el-option label="常温" value="常温" />
                <el-option label="冷藏(2-8℃)" value="冷藏" />
                <el-option label="冷冻(-18℃以下)" value="冷冻" />
                <el-option label="恒温" value="恒温" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="湿度要求">
              <el-select v-model="form.humidityReq" placeholder="请选择" clearable style="width: 100%">
                <el-option label="普通" value="普通" />
                <el-option label="干燥" value="干燥" />
                <el-option label="防潮" value="防潮" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">层级管理</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="多层级管理">
              <el-switch v-model="form.enableLocation" :active-value="1" :inactive-value="0" active-text="开启" inactive-text="关闭" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWarehouse">保存</el-button>
      </template>
    </el-dialog>

    <!-- 仓库详情 Drawer -->
    <el-drawer v-model="detailVisible" :title="detailData?.warehouseName || '仓库详情'" size="70%" :close-on-click-modal="true">
      <template v-if="detailData">
        <!-- 仓库信息卡片 -->
        <el-descriptions :column="3" border size="small" class="detail-desc">
          <el-descriptions-item label="仓库编码">{{ detailData.warehouseCode }}</el-descriptions-item>
          <el-descriptions-item label="仓库名称">{{ detailData.warehouseName }}</el-descriptions-item>
          <el-descriptions-item label="仓库类型">{{ detailData.warehouseType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detailData.manager || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailData.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="面积(m²)">{{ detailData.area ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{ detailData.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailData.status ? 'success' : 'info'" size="small">{{ detailData.status ? '启用' : '停用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="温度要求">{{ detailData.temperatureReq || '-' }}</el-descriptions-item>
          <el-descriptions-item label="湿度要求">{{ detailData.humidityReq || '-' }}</el-descriptions-item>
          <el-descriptions-item label="多层级管理">
            <el-tag :type="detailData.enableLocation ? 'success' : 'info'" size="small">{{ detailData.enableLocation ? '已开启' : '未开启' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 即时库存概览占位 -->
        <el-card shadow="never" class="detail-section">
          <template #header>
            <span class="section-title">即时库存概览</span>
          </template>
          <el-empty description="库存模块上线后将展示即时库存数据" :image-size="60" />
        </el-card>

        <!-- 简单模式提示 -->
        <template v-if="!detailData.enableLocation">
          <el-alert title="当前为简单模式，如需管理库区/库位请在编辑中开启「多层级管理」开关" type="info" show-icon :closable="false" class="detail-section" />
        </template>

        <!-- 多层级管理：库区/库位 -->
        <template v-else>
          <el-card shadow="never" class="detail-section">
            <el-tabs v-model="detailTab">
              <el-tab-pane label="库区管理" name="area">
                <div class="tab-toolbar">
                  <el-button type="primary" size="small" :icon="Plus" @click="showAreaDialog()">新增库区</el-button>
                </div>
                <el-table :data="detailData.areas || []" :fit="false" size="small" v-loading="detailLoading">
                  <el-table-column prop="areaCode" label="库区编码" width="120" />
                  <el-table-column prop="areaName" label="库区名称" min-width="160" show-overflow-tooltip />
                  <el-table-column prop="areaType" label="库区类型" width="120">
                    <template #default="{ row }">{{ row.areaType || '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="locationCount" label="库位数" width="80" align="center" />
                  <el-table-column prop="sort" label="排序" width="70" align="center" />
                  <el-table-column label="操作" width="160" align="left" fixed="right">
                    <template #default="{ row }">
                      <div class="table-actions">
                        <el-button type="primary" link size="small" @click="selectAreaForLocations(row)">库位</el-button>
                        <el-button type="primary" link size="small" @click="showAreaDialog(row)">编辑</el-button>
                        <el-button type="danger" link size="small" @click="handleDeleteArea(row)">删除</el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>

              <el-tab-pane label="库位管理" name="location">
                <div class="tab-toolbar">
                  <el-select v-model="selectedAreaId" placeholder="请选择库区" clearable style="width: 200px; margin-right: 12px;" @change="fetchLocations">
                    <el-option v-for="area in (detailData.areas || [])" :key="area.id" :label="`${area.areaCode} - ${area.areaName}`" :value="area.id" />
                  </el-select>
                  <el-button type="primary" size="small" :icon="Plus" :disabled="!selectedAreaId" @click="showLocationDialog()">新增库位</el-button>
                </div>
                <el-table :data="locations" :fit="false" size="small" v-loading="locationLoading">
                  <el-table-column prop="locationCode" label="库位编码" width="130" />
                  <el-table-column prop="locationName" label="库位名称" min-width="160" show-overflow-tooltip />
                  <el-table-column label="容量" width="80" align="center">
                    <template #default="{ row }">{{ row.capacity ?? '-' }}</template>
                  </el-table-column>
                  <el-table-column label="最大承重" width="100" align="center">
                    <template #default="{ row }">{{ row.maxWeight != null ? `${row.maxWeight}kg` : '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="sort" label="排序" width="70" align="center" />
                  <el-table-column label="状态" width="70" align="center">
                    <template #default="{ row }">
                      <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="140" align="left" fixed="right">
                    <template #default="{ row }">
                      <div class="table-actions">
                        <el-button type="primary" link size="small" @click="showLocationDialog(row)">编辑</el-button>
                        <el-button type="danger" link size="small" @click="handleDeleteLocation(row)">删除</el-button>
                      </div>
                    </template>
                  </el-table-column>
                  <template #empty>
                    <el-empty :description="selectedAreaId ? '暂无库位' : '请先选择库区'" :image-size="60" />
                  </template>
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </template>
      </template>
    </el-drawer>

    <!-- 库区新增/编辑弹窗 -->
    <el-dialog v-model="areaDialogVisible" :title="editingArea ? '编辑库区' : '新增库区'" width="500px" :close-on-click-modal="false" @closed="handleAreaDialogClosed">
      <el-form ref="areaFormRef" :model="areaForm" :rules="areaRules" label-width="100px">
        <el-form-item label="库区编码" prop="areaCode">
          <el-input v-model="areaForm.areaCode" placeholder="如 A、B、C" :disabled="!!editingArea" />
        </el-form-item>
        <el-form-item label="库区名称" prop="areaName">
          <el-input v-model="areaForm.areaName" placeholder="请输入库区名称" />
        </el-form-item>
        <el-form-item label="库区类型">
          <el-select v-model="areaForm.areaType" placeholder="请选择" clearable style="width: 100%">
            <el-option label="常温区" value="常温区" />
            <el-option label="冷藏区" value="冷藏区" />
            <el-option label="冷冻区" value="冷冻区" />
            <el-option label="危化品区" value="危化品区" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="areaForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="areaForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="areaDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveArea">保存</el-button>
      </template>
    </el-dialog>

    <!-- 库位新增/编辑弹窗 -->
    <el-dialog v-model="locationDialogVisible" :title="editingLocation ? '编辑库位' : '新增库位'" width="500px" :close-on-click-modal="false" @closed="handleLocationDialogClosed">
      <el-form ref="locationFormRef" :model="locationForm" :rules="locationRules" label-width="100px">
        <el-form-item label="库位编码" prop="locationCode">
          <el-input v-model="locationForm.locationCode" placeholder="如 A-01-01" :disabled="!!editingLocation" />
        </el-form-item>
        <el-form-item label="库位名称" prop="locationName">
          <el-input v-model="locationForm.locationName" placeholder="请输入库位名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="容量">
              <el-input-number v-model="locationForm.capacity" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大承重(kg)">
              <el-input-number v-model="locationForm.maxWeight" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="locationForm.sort" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="locationForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="locationForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="locationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLocation">保存</el-button>
      </template>
    </el-dialog>

    <!-- 仓库导入 -->
    <ImportDialog
      v-model="importVisible"
      title="导入仓库"
      :columns="importColumns"
      template-file-name="仓库导入模板"
      :import-fn="importWarehouse"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Search, Refresh, Plus, Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import { exportExcel } from '@/utils/excel'
import { getNextCode } from '@/api/codeRule'
import { getWorkshopEmployeeOptions } from '@/api/basicData'
import {
  getWarehouseList, getWarehouseDetail, createWarehouse, updateWarehouse,
  updateWarehouseStatus, deleteWarehouse,
  getWarehouseAreas, createWarehouseArea, updateWarehouseArea, deleteWarehouseArea,
  getWarehouseLocations, createWarehouseLocation, updateWarehouseLocation, deleteWarehouseLocation,
  importWarehouse
} from '@/api/supplyChain'

// ========== 列表 ==========

const tableData = ref([])
const tableLoading = ref(false)
const search = ref({ keyword: '', status: '' })

async function fetchList() {
  tableLoading.value = true
  try {
    const params = {}
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.status !== '' && search.value.status !== null) params.status = search.value.status
    const res = await getWarehouseList(params)
    tableData.value = res.data || []
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function handleSearch() { fetchList() }
function resetSearch() {
  search.value = { keyword: '', status: '' }
  fetchList()
}

async function handleToggleStatus(row) {
  try {
    await updateWarehouseStatus(row.id, { status: row.status ? 0 : 1 })
    ElMessage.success('状态更新成功')
    fetchList()
  } catch (e) { console.error(e) }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除仓库「${row.warehouseName}」吗？`, '提示', { type: 'warning' })
    await deleteWarehouse(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ========== 仓库弹窗 ==========

const dialogVisible = ref(false)
const editingWarehouse = ref(null)
const formRef = ref(null)
const employeeOptions = ref([])
let employeeOptionsLoaded = false

function formatEmployeeOptionLabel(employee) {
  const name = employee?.displayName || employee?.name || employee?.empNo || ''
  const code = employee?.empNo ? `${employee.empNo} - ${name}` : name
  return employee?.phone ? `${code} (${employee.phone})` : code
}

function findEmployeeOption(employeeId) {
  return employeeOptions.value.find(item => item.id === employeeId) || null
}

function findEmployeeIdByName(name) {
  if (!name) return null
  const normalized = String(name).trim()
  return employeeOptions.value.find(item => item.displayName === normalized || item.name === normalized || item.empNo === normalized)?.id || null
}

async function fetchEmployeeOptions() {
  try {
    const res = await getWorkshopEmployeeOptions()
    employeeOptions.value = Array.isArray(res.data) ? res.data : []
    employeeOptionsLoaded = true
  } catch (e) {
    console.error(e)
    employeeOptions.value = []
  }
}

async function ensureEmployeeOptions() {
  if (!employeeOptionsLoaded) await fetchEmployeeOptions()
}

function handleManagerChange(employeeId) {
  const employee = findEmployeeOption(employeeId)
  form.value.manager = employee?.displayName || ''
  form.value.phone = employee?.phone || ''
}

function defaultForm() {
  return {
    warehouseCode: '', warehouseName: '', warehouseType: '',
    manager: '', managerUserId: null, phone: '', address: '', area: null,
    temperatureReq: '', humidityReq: '',
    enableLocation: 0, status: 1, remark: ''
  }
}
const form = ref(defaultForm())
const formRules = {
  warehouseCode: [{ required: true, message: '请输入仓库编码', trigger: 'blur' }],
  warehouseName: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }]
}

async function showWarehouseDialog(row) {
  await ensureEmployeeOptions()
  editingWarehouse.value = row || null
  if (row) {
    form.value = {
      warehouseCode: row.warehouseCode, warehouseName: row.warehouseName,
      warehouseType: row.warehouseType || '', manager: row.manager || '',
      managerUserId: findEmployeeIdByName(row.manager),
      phone: row.phone || '', address: row.address || '', area: row.area,
      temperatureReq: row.temperatureReq || '', humidityReq: row.humidityReq || '',
      enableLocation: row.enableLocation ? 1 : 0, status: row.status ?? 1, remark: row.remark || ''
    }
  } else {
    form.value = defaultForm()
    getNextCode('warehouse').then(res => {
      if (res.data?.preview) form.value.warehouseCode = res.data.preview
    }).catch(() => {})
  }
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.resetFields()
  editingWarehouse.value = null
}

async function saveWarehouse() {
  try {
    await formRef.value.validate()
    if (editingWarehouse.value) {
      await updateWarehouse(editingWarehouse.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await createWarehouse(form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

// ========== 仓库详情 ==========

const detailVisible = ref(false)
const detailData = ref(null)
const detailLoading = ref(false)
const detailTab = ref('area')

async function openDetail(row) {
  detailLoading.value = true
  detailVisible.value = true
  detailTab.value = 'area'
  selectedAreaId.value = null
  locations.value = []
  try {
    const res = await getWarehouseDetail(row.id)
    detailData.value = res.data || null
  } catch (e) { console.error(e) }
  finally { detailLoading.value = false }
}

async function refreshDetail() {
  if (!detailData.value) return
  try {
    const res = await getWarehouseDetail(detailData.value.id)
    detailData.value = res.data || null
  } catch (e) { console.error(e) }
}

// ========== 库区 CRUD ==========

const areaDialogVisible = ref(false)
const editingArea = ref(null)
const areaFormRef = ref(null)
const areaForm = ref({ areaCode: '', areaName: '', areaType: '', sort: 0, remark: '' })
const areaRules = {
  areaCode: [{ required: true, message: '请输入库区编码', trigger: 'blur' }],
  areaName: [{ required: true, message: '请输入库区名称', trigger: 'blur' }]
}

function showAreaDialog(row) {
  editingArea.value = row || null
  if (row) {
    areaForm.value = { areaCode: row.areaCode, areaName: row.areaName, areaType: row.areaType || '', sort: row.sort || 0, remark: row.remark || '' }
  } else {
    areaForm.value = { areaCode: '', areaName: '', areaType: '', sort: 0, remark: '' }
    getNextCode('warehouse_area').then(res => {
      if (res.data?.preview) areaForm.value.areaCode = res.data.preview
    }).catch(() => {})
  }
  areaDialogVisible.value = true
}

function handleAreaDialogClosed() {
  areaFormRef.value?.resetFields()
  editingArea.value = null
}

async function saveArea() {
  try {
    await areaFormRef.value.validate()
    const whId = detailData.value.id
    if (editingArea.value) {
      await updateWarehouseArea(whId, editingArea.value.id, areaForm.value)
      ElMessage.success('库区更新成功')
    } else {
      await createWarehouseArea(whId, areaForm.value)
      ElMessage.success('库区添加成功')
    }
    areaDialogVisible.value = false
    await refreshDetail()
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleDeleteArea(row) {
  try {
    await ElMessageBox.confirm(`确定删除库区「${row.areaName}」吗？`, '提示', { type: 'warning' })
    await deleteWarehouseArea(detailData.value.id, row.id)
    ElMessage.success('删除成功')
    if (selectedAreaId.value === row.id) {
      selectedAreaId.value = null
      locations.value = []
    }
    await refreshDetail()
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

function selectAreaForLocations(row) {
  selectedAreaId.value = row.id
  detailTab.value = 'location'
  fetchLocations()
}

// ========== 库位 CRUD ==========

const selectedAreaId = ref(null)
const locations = ref([])
const locationLoading = ref(false)

async function fetchLocations() {
  if (!selectedAreaId.value) { locations.value = []; return }
  locationLoading.value = true
  try {
    const res = await getWarehouseLocations(selectedAreaId.value)
    locations.value = res.data || []
  } catch (e) { console.error(e) }
  finally { locationLoading.value = false }
}

const locationDialogVisible = ref(false)
const editingLocation = ref(null)
const locationFormRef = ref(null)

function defaultLocationForm() {
  return { locationCode: '', locationName: '', capacity: null, maxWeight: null, sort: 0, status: 1, remark: '' }
}
const locationForm = ref(defaultLocationForm())
const locationRules = {
  locationCode: [{ required: true, message: '请输入库位编码', trigger: 'blur' }],
  locationName: [{ required: true, message: '请输入库位名称', trigger: 'blur' }]
}

function showLocationDialog(row) {
  editingLocation.value = row || null
  if (row) {
    locationForm.value = {
      locationCode: row.locationCode, locationName: row.locationName,
      capacity: row.capacity, maxWeight: row.maxWeight,
      sort: row.sort || 0, status: row.status ?? 1, remark: row.remark || ''
    }
  } else {
    locationForm.value = defaultLocationForm()
    getNextCode('warehouse_location').then(res => {
      if (res.data?.preview) locationForm.value.locationCode = res.data.preview
    }).catch(() => {})
  }
  locationDialogVisible.value = true
}

function handleLocationDialogClosed() {
  locationFormRef.value?.resetFields()
  editingLocation.value = null
}

async function saveLocation() {
  try {
    await locationFormRef.value.validate()
    const areaId = selectedAreaId.value
    if (editingLocation.value) {
      await updateWarehouseLocation(areaId, editingLocation.value.id, locationForm.value)
      ElMessage.success('库位更新成功')
    } else {
      await createWarehouseLocation(areaId, locationForm.value)
      ElMessage.success('库位添加成功')
    }
    locationDialogVisible.value = false
    await fetchLocations()
    await refreshDetail()
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleDeleteLocation(row) {
  try {
    await ElMessageBox.confirm(`确定删除库位「${row.locationName}」吗？`, '提示', { type: 'warning' })
    await deleteWarehouseLocation(selectedAreaId.value, row.id)
    ElMessage.success('删除成功')
    await fetchLocations()
    await refreshDetail()
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ========== 导入导出 ==========

const importVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const importColumns = [
  { key: 'warehouseCode', label: '仓库编码', required: true, example: 'WH-001', width: 14 },
  { key: 'warehouseName', label: '仓库名称', required: true, example: '原材料仓库', width: 16 },
  { key: 'warehouseType', label: '仓库类型', example: '原材料仓', width: 12, note: '原材料仓/成品仓/半成品仓/退货仓/待检仓' },
  { key: 'manager', label: '负责人', example: '张三', width: 10 },
  { key: 'phone', label: '联系电话', example: '13800138000', width: 14 },
  { key: 'address', label: '地址', example: '厂区B栋', width: 18 },
  { key: 'area', label: '面积(m²)', example: '200', width: 10 },
  { key: 'temperatureReq', label: '温度要求', example: '常温', width: 10, note: '常温/冷藏/冷冻/恒温' },
  { key: 'humidityReq', label: '湿度要求', example: '普通', width: 10 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const exportColumns = [
  { key: 'warehouseCode', label: '仓库编码', width: 14 },
  { key: 'warehouseName', label: '仓库名称', width: 16 },
  { key: 'warehouseType', label: '仓库类型', width: 12 },
  { key: 'manager', label: '负责人', width: 10 },
  { key: 'phone', label: '联系电话', width: 14 },
  { key: 'address', label: '地址', width: 18 },
  { key: 'area', label: '面积(m²)', width: 10 },
  { key: 'temperatureReq', label: '温度要求', width: 10 },
  { key: 'humidityReq', label: '湿度要求', width: 10 },
  { key: 'enableLocation', label: '多层级管理', width: 12, formatter: (v) => v === 1 ? '是' : '否' },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleImportSuccess() {
  fetchList()
}

function handleExport() {
  const data = selectedRows.value.length ? selectedRows.value : tableData.value
  if (!data.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  const fileName = selectedRows.value.length
    ? `仓库_已选${selectedRows.value.length}条`
    : '仓库_全部'
  exportExcel(data, exportColumns, fileName)
  ElMessage.success(`已导出 ${data.length} 条数据`)
}

onMounted(() => {
  fetchEmployeeOptions()
  fetchList()
})
</script>

<style lang="scss" scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
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

.detail-desc {
  margin-bottom: 16px;
}

.detail-section {
  margin-top: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.tab-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
</style>
