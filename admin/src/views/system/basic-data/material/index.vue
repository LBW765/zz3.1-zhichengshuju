<template>
  <div class="page-shell">
    <PageHeader title="物料档案" description="管理物料分类与物料基础信息" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
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
            <span class="search-bar__label">物料类型</span>
            <el-select v-model="search.materialType" placeholder="全部" clearable style="width: 130px">
              <el-option label="原材料" value="原材料" />
              <el-option label="半成品" value="半成品" />
              <el-option label="成品" value="成品" />
            </el-select>
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">来源方式</span>
            <el-select v-model="search.sourceType" placeholder="全部" clearable style="width: 130px">
              <el-option label="外购" value="外购" />
              <el-option label="自制" value="自制" />
              <el-option label="委外" value="委外" />
            </el-select>
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <!-- 左右分栏 -->
    <div class="split-panel page-shell__section">
      <!-- 左侧：物料分类树 -->
      <div class="split-panel__left" style="width: 280px; min-width: 280px;">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">物料分类</span>
              <span class="panel-header__actions">
                <el-button type="primary" :icon="Plus" size="small" circle title="新增分类" @click="showCategoryDialog()" />
                <el-dropdown trigger="click" @command="handleCategoryCommand">
                  <el-button :icon="MoreFilled" size="small" circle title="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="import" :icon="Upload">导入分类</el-dropdown-item>
                      <el-dropdown-item command="export" :icon="Download">
                        导出分类{{ selectedCategoryRows.length ? `（${selectedCategoryRows.length}）` : '' }}
                      </el-dropdown-item>
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
              <span>全部物料</span>
            </div>
            <el-tree
              ref="treeRef"
              :data="categoryTree"
              node-key="id"
              highlight-current
              show-checkbox
              default-expand-all
              :expand-on-click-node="false"
              @check="handleCategoryCheck"
              @node-click="handleCategoryClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node">
                  <span class="tree-node__label">{{ data.name }}</span>
                  <span class="tree-node__actions">
                    <el-button type="primary" link size="small" :icon="Plus" @click.stop="showCategoryDialog(null, data.id)" />
                    <el-button type="primary" link size="small" :icon="Edit" @click.stop="showCategoryDialog(data)" />
                    <el-button type="danger" link size="small" :icon="Delete" @click.stop="handleDeleteCategory(data)" />
                  </span>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>

      <!-- 右侧：物料列表 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ rightPanelTitle }}</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="materialImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Download" size="small" @click="materialExportVisible = true">
                  导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}
                </el-button>
                <el-button type="primary" text :icon="Plus" size="small" @click="showMaterialDialog()">新增</el-button>
              </span>
            </div>
          </template>

          <div class="table-shell">
            <el-table :data="materialList" v-loading="materialLoading" stripe size="small" :fit="false" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="45" />
              <el-table-column prop="materialCode" label="物料编码" min-width="140" show-overflow-tooltip />
              <el-table-column prop="materialName" label="物料名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="materialType" label="物料类型" width="100" align="center">
                <template #default="{ row }">
                  <el-tag
                    :type="materialTypeTag(row.materialType)"
                    size="small"
                  >{{ row.materialType }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sourceType" label="来源方式" width="100" align="center" />
              <el-table-column prop="purchaseLeadDays" label="采购提前期" width="110" align="center">
                <template #default="{ row }">
                  {{ row.purchaseLeadDays ?? '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="spec" label="规格型号" min-width="140" show-overflow-tooltip />
              <el-table-column label="计量单位" width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ formatUnit(row.unitId) }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.status"
                    :active-value="1"
                    :inactive-value="0"
                    size="small"
                    @change="(val) => handleMaterialStatusChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" fixed="right" align="left">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" link size="small" @click="showBomDrawer(row)">BOM</el-button>
                    <el-button type="primary" link size="small" @click="showMaterialDialog(row)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="handleDeleteMaterial(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="暂无物料数据" :image-size="60" />
              </template>
            </el-table>
          </div>

          <Pagination
            :total="total"
            v-model:page="page"
            v-model:limit="pageSize"
            @pagination="fetchMaterialList"
          />
        </el-card>
      </div>
    </div>

    <!-- 物料分类弹窗 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑物料分类' : '新增物料分类'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleCategoryDialogClosed"
    >
      <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="100px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="categoryForm.categoryName" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="categoryCode">
          <el-input v-model="categoryForm.categoryCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingCategory" />
        </el-form-item>
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select
            v-model="categoryForm.parentId"
            :data="categoryTreeForSelect"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            check-strictly
            :render-after-expand="false"
            placeholder="无（顶级分类）"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="categoryForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="categoryForm.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 物料弹窗 -->
    <el-dialog
      v-model="materialDialogVisible"
      :title="editingMaterial ? '编辑物料' : '新增物料'"
      width="760px"
      :close-on-click-modal="false"
      @closed="handleMaterialDialogClosed"
    >
      <el-form ref="materialFormRef" :model="materialForm" :rules="materialRules" label-width="100px">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="form-section__title">基本信息</div>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="物料编码" prop="materialCode">
                <el-input v-model="materialForm.materialCode" placeholder="系统自动生成，可手动修改" :disabled="!!editingMaterial" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物料名称" prop="materialName">
                <el-input v-model="materialForm.materialName" placeholder="请输入物料名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物料分类" prop="categoryId">
                <el-tree-select
                  v-model="materialForm.categoryId"
                  :data="categoryTree"
                  :props="{ label: 'name', value: 'id', children: 'children' }"
                  check-strictly
                  :render-after-expand="false"
                  placeholder="请选择物料分类"
                  clearable
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物料类型" prop="materialType">
                <el-select v-model="materialForm.materialType" placeholder="请选择" style="width: 100%">
                  <el-option label="原材料" value="原材料" />
                  <el-option label="半成品" value="半成品" />
                  <el-option label="成品" value="成品" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="来源方式" prop="sourceType">
                <el-select v-model="materialForm.sourceType" placeholder="请选择" style="width: 100%">
                  <el-option label="自制" value="自制" />
                  <el-option label="采购" value="采购" />
                  <el-option label="委外" value="委外" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规格型号">
                <el-input v-model="materialForm.spec" placeholder="请输入规格型号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="主计量单位" prop="unitId">
                <el-select v-model="materialForm.unitId" placeholder="请选择" clearable style="width: 100%" filterable>
                  <el-option
                    v-for="u in unitOptions"
                    :key="u.id"
                    :label="`${u.unitName}（${u.unitCode}）`"
                    :value="u.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="辅计量单位">
                <el-select v-model="materialForm.auxUnitId" placeholder="请选择" clearable style="width: 100%" filterable>
                  <el-option
                    v-for="u in unitOptions"
                    :key="u.id"
                    :label="`${u.unitName}（${u.unitCode}）`"
                    :value="u.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单重">
                <el-input-number v-model="materialForm.weight" :min="0" :precision="4" :controls="false" style="width: 100%" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="参考单价">
                <el-input-number v-model="materialForm.price" :min="0" :precision="2" :controls="false" style="width: 100%" placeholder="请输入" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 管理开关 -->
        <div class="form-section">
          <div class="form-section__title">管理开关</div>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="保质期管理">
                <el-switch v-model="materialForm.enableShelfLife" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
            <el-col v-if="materialForm.enableShelfLife" :span="12">
              <el-form-item label="保质期天数" prop="shelfLifeDays">
                <el-input-number v-model="materialForm.shelfLifeDays" :min="1" :controls="false" style="width: 100%" placeholder="天" />
              </el-form-item>
            </el-col>
            <el-col v-if="materialForm.enableShelfLife" :span="12">
              <el-form-item label="预警天数">
                <el-input-number v-model="materialForm.shelfLifeWarnDays" :min="1" :controls="false" style="width: 100%" placeholder="天" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="序列号管理">
                <el-switch v-model="materialForm.enableSerial" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="批次管理">
                <el-switch v-model="materialForm.enableBatch" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="质检管理">
                <el-switch v-model="materialForm.enableInspection" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="安全库存下限">
                <el-input-number v-model="materialForm.stockMin" :min="0" :precision="2" :controls="false" style="width: 100%" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="安全库存上限">
                <el-input-number v-model="materialForm.stockMax" :min="0" :precision="2" :controls="false" style="width: 100%" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最小采购量">
                <el-input-number v-model="materialForm.minPurchaseQty" :min="0" :precision="2" :controls="false" style="width: 100%" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="采购提前天数">
                <el-input-number v-model="materialForm.purchaseLeadDays" :min="0" :precision="0" :controls="false" style="width: 100%" placeholder="MRP采购件使用，可选" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="允许负库存">
                <el-switch v-model="materialForm.allowNegativeStock" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 其他 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="materialForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="materialForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="materialDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMaterial">保存</el-button>
      </template>
    </el-dialog>

    <!-- 物料分类导入 -->
    <ImportDialog
      v-model="categoryImportVisible"
      title="导入物料分类"
      :columns="categoryImportColumns"
      template-file-name="物料分类导入模板"
      :import-fn="importMaterialCategory"
      @success="handleCategoryImportSuccess"
    />

    <ExportDialog
      v-model="categoryExportVisible"
      title="导出物料分类"
      :fields="categoryExportFields"
      :selected-count="selectedCategoryRows.length"
      :current-page-count="categoryList.length"
      :total-count="categoryList.length"
      :export-fn="handleExportCategory"
    />

    <!-- 物料档案导入 -->
    <ImportDialog
      v-model="materialImportVisible"
      title="导入物料档案"
      :columns="materialImportColumns"
      template-file-name="物料档案导入模板"
      :import-fn="importMaterial"
      @success="handleMaterialImportSuccess"
    />

    <ExportDialog
      v-model="materialExportVisible"
      title="导出物料档案"
      :fields="materialExportFields"
      :selected-count="selectedRows.length"
      :current-page-count="materialList.length"
      :total-count="total"
      :export-fn="handleExportMaterial"
    />

    <!-- BOM 构成抽屉 -->
    <el-drawer
      v-model="bomDrawerVisible"
      :title="`${bomDrawerMaterial?.materialName || ''} — BOM 构成`"
      size="520px"
      :close-on-click-modal="true"
    >
      <div v-loading="bomDrawerLoading">
        <el-empty v-if="!bomDrawerLoading && !bomDrawerList.length" description="该物料暂无 BOM 数据" />
        <div v-for="bom in bomDrawerList" :key="bom.id" class="bom-card">
          <div class="bom-card__header">
            <span class="bom-card__code">{{ bom.bomCode }}</span>
            <el-tag size="small" style="margin-left: 8px;">{{ bom.version }}</el-tag>
            <el-tag v-if="bom.sourceType === 'derived'" type="info" size="small" style="margin-left: 4px;">自动生成</el-tag>
          </div>
          <el-tree
            :data="bom.treeItems || []"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            :expand-on-click-node="false"
          >
            <template #default="{ data }">
              <span class="bom-tree-node">
                <span>{{ data.label }}</span>
                <span class="bom-tree-node__qty">× {{ data.quantity }}{{ data.unit ? ' ' + data.unit : '' }}</span>
                <span v-if="data.lossRate" class="bom-tree-node__loss">损耗{{ data.lossRate }}%</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Download, Edit, Folder, MoreFilled, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { exportExcel } from '@/utils/excel'
import {
  getMaterialCategoryList, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
  getMaterialList, createMaterial, updateMaterial, updateMaterialStatus, deleteMaterial,
  getUnitList, importMaterialCategory, importMaterial, exportMaterialCategory, exportMaterial,
  getBomsByMaterial, getBomTree
} from '@/api/basicData'
import { getNextCode } from '@/api/codeRule'

// ——— 工具函数 ———

function buildTree(list, parentId = null) {
  return list
    .filter(item => item.parentId === parentId)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map(item => {
      const node = { ...item, name: item.categoryName, code: item.categoryCode }
      const children = buildTree(list, item.id)
      if (children.length) node.children = children
      return node
    })
}

function materialTypeTag(type) {
  const map = { '原材料': '', '半成品': 'warning', '成品': 'success' }
  return map[type] || 'info'
}

// ——— 搜索 ———

const search = ref({ keyword: '', materialType: '', sourceType: '' })

function handleSearch() {
  page.value = 1
  fetchMaterialList()
}

function resetSearch() {
  search.value = { keyword: '', materialType: '', sourceType: '' }
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  page.value = 1
  fetchMaterialList()
}

// ——— 单位选项 ———

const unitOptions = ref([])

async function fetchUnitOptions() {
  try {
    const res = await getUnitList({ status: 1 })
    unitOptions.value = res.data.list || []
  } catch (e) {
    console.error(e)
  }
}

function formatUnit(unitId) {
  if (!unitId) return '-'
  const u = unitOptions.value.find(item => item.id === unitId)
  return u ? `${u.unitName}（${u.unitCode}）` : '-'
}

// ——— 物料分类 ———

const treeRef = ref(null)
const categoryList = ref([])
const categoryLoading = ref(false)
const selectedCategoryId = ref(null)

const categoryTree = computed(() => buildTree(categoryList.value))

const categoryTreeForSelect = computed(() => {
  if (!editingCategory.value) return categoryTree.value
  const excludeId = editingCategory.value.id
  const filterTree = (nodes) => {
    return nodes
      .filter(n => n.id !== excludeId)
      .map(n => {
        if (n.children) {
          return { ...n, children: filterTree(n.children) }
        }
        return { ...n }
      })
  }
  return filterTree(categoryTree.value)
})

async function fetchCategoryList() {
  categoryLoading.value = true
  try {
    const res = await getMaterialCategoryList()
    categoryList.value = res.data.list || []
  } catch (e) {
    console.error(e)
  } finally {
    categoryLoading.value = false
  }
}

function handleSelectAllCategory() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  page.value = 1
  fetchMaterialList()
}

function handleCategoryClick(data) {
  selectedCategoryId.value = data.id
  page.value = 1
  fetchMaterialList()
}

const selectedCategoryRows = ref([])

function handleCategoryCheck(_data, checkedInfo) {
  selectedCategoryRows.value = checkedInfo.checkedNodes || []
}

function handleCategoryCommand(command) {
  if (command === 'import') categoryImportVisible.value = true
  if (command === 'export') categoryExportVisible.value = true
}

function getCategoryName(id) {
  const item = categoryList.value.find(c => c.id === id)
  return item ? item.categoryName : ''
}

const rightPanelTitle = computed(() => {
  if (selectedCategoryId.value) {
    const name = getCategoryName(selectedCategoryId.value)
    return name ? `${name} — 物料列表` : '物料列表'
  }
  return '全部物料 — 物料列表'
})

// 分类弹窗
const categoryDialogVisible = ref(false)
const editingCategory = ref(null)
const categoryFormRef = ref(null)

function defaultCategoryForm(parentId) {
  return { categoryName: '', categoryCode: '', parentId: parentId || null, sort: 0, status: 1, remark: '' }
}
const categoryForm = ref(defaultCategoryForm())

const categoryRules = {
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  categoryCode: [{ required: true, message: '请输入分类编码', trigger: 'blur' }]
}

function showCategoryDialog(row, parentId) {
  editingCategory.value = row || null
  if (row) {
    categoryForm.value = {
      categoryName: row.name || row.categoryName,
      categoryCode: row.code || row.categoryCode,
      parentId: row.parentId || null,
      sort: row.sort || 0,
      status: row.status,
      remark: row.remark || ''
    }
  } else {
    categoryForm.value = defaultCategoryForm(parentId)
    getNextCode('material_category').then(res => {
      if (res.data?.preview) categoryForm.value.categoryCode = res.data.preview
    }).catch(() => {})
  }
  categoryDialogVisible.value = true
}

function handleCategoryDialogClosed() {
  categoryFormRef.value?.resetFields()
  editingCategory.value = null
}

async function saveCategory() {
  try {
    await categoryFormRef.value.validate()
    if (editingCategory.value) {
      await updateMaterialCategory(editingCategory.value.id, categoryForm.value)
      ElMessage.success('更新成功')
    } else {
      await createMaterialCategory(categoryForm.value)
      ElMessage.success('添加成功')
    }
    categoryDialogVisible.value = false
    await fetchCategoryList()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleDeleteCategory(data) {
  const hasChildren = categoryList.value.some(c => c.parentId === data.id)
  if (hasChildren) {
    ElMessage.warning('该分类下有子分类，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteMaterialCategory(data.id)
    ElMessage.success('删除成功')
    if (selectedCategoryId.value === data.id) {
      selectedCategoryId.value = null
    }
    await fetchCategoryList()
    fetchMaterialList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 物料列表 ———

const materialList = ref([])
const materialLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

async function fetchMaterialList() {
  materialLoading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.materialType) params.materialType = search.value.materialType
    if (search.value.sourceType) params.sourceType = search.value.sourceType
    const res = await getMaterialList(params)
    materialList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    materialLoading.value = false
  }
}

// 物料弹窗
const materialDialogVisible = ref(false)
const editingMaterial = ref(null)
const materialFormRef = ref(null)

function defaultMaterialForm() {
  return {
    materialCode: '',
    materialName: '',
    categoryId: selectedCategoryId.value || null,
    materialType: '',
    sourceType: '',
    spec: '',
    unitId: null,
    auxUnitId: null,
    weight: null,
    price: null,
    enableShelfLife: 0,
    shelfLifeDays: null,
    shelfLifeWarnDays: null,
    enableSerial: 0,
    enableBatch: 0,
    enableInspection: 0,
    stockMin: null,
    stockMax: null,
    minPurchaseQty: null,
    purchaseLeadDays: null,
    allowNegativeStock: 0,
    status: 1,
    remark: ''
  }
}
const materialForm = ref(defaultMaterialForm())

const materialRules = {
  materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
  materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择物料分类', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择物料类型', trigger: 'change' }],
  sourceType: [{ required: true, message: '请选择来源方式', trigger: 'change' }],
  unitId: [{ required: true, message: '请选择计量单位', trigger: 'change' }],
  shelfLifeDays: [{ required: true, message: '请输入保质期天数', trigger: 'blur' }]
}

function showMaterialDialog(row) {
  editingMaterial.value = row || null
  if (row) {
    materialForm.value = {
      materialCode: row.materialCode,
      materialName: row.materialName,
      categoryId: row.categoryId,
      materialType: row.materialType,
      sourceType: row.sourceType,
      spec: row.spec || '',
      unitId: row.unitId,
      auxUnitId: row.auxUnitId || null,
      weight: row.weight ?? null,
      price: row.price ?? null,
      enableShelfLife: row.enableShelfLife || 0,
      shelfLifeDays: row.shelfLifeDays ?? null,
      shelfLifeWarnDays: row.shelfLifeWarnDays ?? null,
      enableSerial: row.enableSerial || 0,
      enableBatch: row.enableBatch || 0,
      enableInspection: row.enableInspection || 0,
      stockMin: row.stockMin ?? null,
      stockMax: row.stockMax ?? null,
      minPurchaseQty: row.minPurchaseQty ?? null,
      purchaseLeadDays: row.purchaseLeadDays ?? null,
      allowNegativeStock: row.allowNegativeStock || 0,
      status: row.status,
      remark: row.remark || ''
    }
  } else {
    materialForm.value = defaultMaterialForm()
    getNextCode('material').then(res => {
      if (res.data?.preview) materialForm.value.materialCode = res.data.preview
    }).catch(() => {})
  }
  materialDialogVisible.value = true
}

function handleMaterialDialogClosed() {
  materialFormRef.value?.resetFields()
  editingMaterial.value = null
}

async function saveMaterial() {
  try {
    await materialFormRef.value.validate()
    const payload = { ...materialForm.value }
    if (!payload.enableShelfLife) {
      payload.shelfLifeDays = null
      payload.shelfLifeWarnDays = null
    }
    if (editingMaterial.value) {
      await updateMaterial(editingMaterial.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createMaterial(payload)
      ElMessage.success('添加成功')
    }
    materialDialogVisible.value = false
    await fetchMaterialList()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleMaterialStatusChange(row, val) {
  try {
    await updateMaterialStatus(row.id, { status: val })
    ElMessage.success(val ? '已启用' : '已停用')
  } catch (e) {
    row.status = val ? 0 : 1
  }
}

async function handleDeleteMaterial(row) {
  try {
    await ElMessageBox.confirm(`确定删除物料「${row.materialName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteMaterial(row.id)
    ElMessage.success('删除成功')
    await fetchMaterialList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ——— 通用 ———

function refreshAll() {
  resetSearch()
  fetchCategoryList()
  fetchMaterialList()
}

onMounted(() => {
  fetchCategoryList()
  fetchUnitOptions()
  fetchMaterialList()
})

// ——— BOM 构成抽屉 ———

const bomDrawerVisible = ref(false)
const bomDrawerLoading = ref(false)
const bomDrawerMaterial = ref(null)
const bomDrawerList = ref([])

function buildBomTreeLabel(items) {
  return (items || []).map(item => {
    const name = item.material?.name || item.materialName || item.material?.code || '未知物料'
    return {
      label: name,
      quantity: item.quantity,
      unit: item.unit || '',
      lossRate: item.lossRate || 0,
      children: item.children?.length ? buildBomTreeLabel(item.children) : undefined
    }
  })
}

async function showBomDrawer(row) {
  bomDrawerMaterial.value = row
  bomDrawerVisible.value = true
  bomDrawerLoading.value = true
  bomDrawerList.value = []
  try {
    const res = await getBomsByMaterial(row.id)
    const boms = res.data || []
    for (const bom of boms) {
      try {
        const treeRes = await getBomTree(bom.id)
        bom.treeItems = buildBomTreeLabel(treeRes.data?.items || treeRes.data || [])
      } catch {
        bom.treeItems = []
      }
    }
    bomDrawerList.value = boms
  } catch (e) {
    console.error(e)
  } finally {
    bomDrawerLoading.value = false
  }
}

// ——— 导入导出 ———

const categoryImportVisible = ref(false)
const materialImportVisible = ref(false)
const categoryExportVisible = ref(false)
const materialExportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const categoryImportColumns = [
  { key: 'categoryCode', label: '分类编码', required: true, example: 'ML-001', width: 16, unique: true, maxLength: 50 },
  { key: 'categoryName', label: '分类名称', required: true, example: '原材料', width: 16, maxLength: 100 },
  { key: 'parentCode', label: '上级分类编码', example: '', width: 18, note: '留空则为顶级分类' },
  { key: 'sort', label: '排序', example: '0', width: 10, type: 'number' },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const materialImportColumns = [
  { key: 'materialCode', label: '物料编码', required: true, example: 'WL-00001', width: 16, unique: true, maxLength: 50 },
  { key: 'materialName', label: '物料名称', required: true, example: '铝合金板材', width: 18, maxLength: 100 },
  { key: 'categoryName', label: '物料分类', required: true, example: '原材料', width: 14, note: '填写分类名称' },
  { key: 'materialType', label: '物料类型', required: true, example: '原材料', width: 12, note: '原材料/半成品/成品', enum: ['原材料', '半成品', '成品'] },
  { key: 'sourceType', label: '来源方式', required: true, example: '采购', width: 12, note: '自制/采购/委外', enum: ['自制', '采购', '委外', '外购'] },
  { key: 'spec', label: '规格型号', example: '2mm×1000mm×2000mm', width: 22 },
  { key: 'unitName', label: '计量单位', required: true, example: '千克', width: 12, note: '填写单位名称或编码' },
  { key: 'auxUnitName', label: '辅助单位', example: '', width: 12, note: '填写单位名称或编码' },
  { key: 'weight', label: '单重', example: '10.5', width: 12, type: 'number' },
  { key: 'price', label: '参考单价', example: '25.00', width: 14, type: 'number' },
  { key: 'enableShelfLife', label: '保质期管理', example: '否', width: 14, note: '是/否', enum: ['是', '否', '1', '0'] },
  { key: 'shelfLifeDays', label: '保质期天数', example: '', width: 14, type: 'number' },
  { key: 'shelfLifeWarnDays', label: '保质期预警天数', example: '', width: 16, type: 'number' },
  { key: 'enableSerial', label: '序列号管理', example: '否', width: 14, note: '是/否', enum: ['是', '否', '1', '0'] },
  { key: 'enableBatch', label: '批次管理', example: '是', width: 12, note: '是/否', enum: ['是', '否', '1', '0'] },
  { key: 'enableInspection', label: '质检管理', example: '否', width: 12, note: '是/否', enum: ['是', '否', '1', '0'] },
  { key: 'stockMin', label: '安全库存下限', example: '100', width: 14, type: 'number' },
  { key: 'stockMax', label: '安全库存上限', example: '1000', width: 14, type: 'number' },
  { key: 'stagnantWarnDays', label: '最长滞留天数', example: '180', width: 14, type: 'number' },
  { key: 'minPurchaseQty', label: '最小采购量', example: '10', width: 12, type: 'number' },
  { key: 'purchaseLeadDays', label: '采购提前天数', example: '7', width: 12, type: 'number' },
  { key: 'allowNegativeStock', label: '允许负库存', example: '否', width: 12, note: '是/否', enum: ['是', '否', '1', '0'] },
  { key: 'status', label: '状态', example: '启用', width: 10, note: '启用/停用', enum: ['启用', '停用', '1', '0'] },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const categoryExportFields = [
  { key: 'categoryCode', label: '分类编码', width: 16 },
  { key: 'categoryName', label: '分类名称', width: 18 },
  { key: 'parentCode', label: '上级分类编码', width: 18 },
  { key: 'parentName', label: '上级分类名称', width: 18 },
  { key: 'sort', label: '排序', width: 10 },
  { key: 'status', label: '状态', width: 10 },
  { key: 'remark', label: '备注', width: 24, default: false },
  { key: 'createdAt', label: '创建时间', width: 20, default: false }
]

const materialExportFields = [
  { key: 'materialCode', label: '物料编码', width: 16 },
  { key: 'materialName', label: '物料名称', width: 18 },
  { key: 'categoryName', label: '物料分类', width: 14 },
  { key: 'materialType', label: '物料类型', width: 12 },
  { key: 'sourceType', label: '来源方式', width: 12 },
  { key: 'spec', label: '规格型号', width: 22 },
  { key: 'unitName', label: '计量单位', width: 12 },
  { key: 'unitCode', label: '单位编码', width: 12, default: false },
  { key: 'weight', label: '单重(kg)', width: 12, default: false },
  { key: 'price', label: '参考单价(元)', width: 14, default: false },
  { key: 'enableShelfLife', label: '保质期管理', width: 12, default: false },
  { key: 'shelfLifeDays', label: '保质期天数', width: 12, default: false },
  { key: 'enableBatch', label: '批次管理', width: 12, default: false },
  { key: 'enableSerial', label: '序列号管理', width: 14, default: false },
  { key: 'enableInspection', label: '质检管理', width: 12, default: false },
  { key: 'stockMin', label: '安全库存下限', width: 14, default: false },
  { key: 'stockMax', label: '安全库存上限', width: 14, default: false },
  { key: 'stagnantWarnDays', label: '最长滞留天数', width: 14, default: false },
  { key: 'minPurchaseQty', label: '最小采购量', width: 12, default: false },
  { key: 'purchaseLeadDays', label: '采购提前天数', width: 12, default: false },
  { key: 'allowNegativeStock', label: '允许负库存', width: 12, default: false },
  { key: 'status', label: '状态', width: 10 },
  { key: 'remark', label: '备注', width: 20, default: false },
  { key: 'createdAt', label: '创建时间', width: 20, default: false }
]

function handleCategoryImportSuccess() {
  fetchCategoryList()
}

function handleMaterialImportSuccess() {
  fetchMaterialList()
}

function getTimestamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function pickFields(fields, keys) {
  return fields.filter(field => keys.includes(field.key))
}

async function handleExportCategory({ scope, fields }) {
  const res = await exportMaterialCategory({
    scope,
    ids: scope === 'selected' ? selectedCategoryRows.value.map(row => row.id) : [],
    fields
  })
  const list = res.data?.list || []
  if (!list.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  exportExcel(list, pickFields(categoryExportFields, fields), `物料分类_${getTimestamp()}`)
  ElMessage.success(`已导出 ${list.length} 条数据`)
}

async function handleExportMaterial({ scope, fields }) {
  const res = await exportMaterial({
    scope,
    ids: scope === 'selected' ? selectedRows.value.map(row => row.id) : [],
    filters: {
      keyword: search.value.keyword,
      categoryId: selectedCategoryId.value,
      materialType: search.value.materialType,
      sourceType: search.value.sourceType
    },
    page: page.value,
    pageSize: pageSize.value,
    fields
  })
  const list = res.data?.list || []
  if (!list.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  exportExcel(list, pickFields(materialExportFields, fields), `物料档案_${getTimestamp()}`)
  ElMessage.success(`已导出 ${list.length} 条数据`)
}
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
    overflow-y: auto;
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

.tree-wrapper {
  padding-top: 4px;
}

.tree-virtual-root {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-bottom: 2px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--bg-hover);
  }

  &.is-active {
    background-color: rgba(var(--primary-color-rgb), 0.1);
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  padding-right: 4px;

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: none;
    flex-shrink: 0;
    margin-left: 8px;

    .el-button {
      padding: 2px;
    }
  }
}

:deep(.el-tree-node__content:hover) .tree-node__actions {
  display: inline-flex;
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

.form-section {
  margin-bottom: 16px;

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-lighter);
  }
}

.bom-card {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-lighter);

  &:last-child {
    border-bottom: none;
  }

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  &__code {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.bom-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  &__qty {
    color: var(--text-secondary);
    font-size: 12px;
  }

  &__loss {
    color: var(--el-color-warning);
    font-size: 12px;
  }
}
</style>
