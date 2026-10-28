<template>
  <div class="page-shell">
    <PageHeader title="BOM管理" description="管理产品物料清单与多级 BOM 结构" class="page-shell__section">
      <template #extra>
        <el-button :icon="Upload" size="small" @click="importVisible = true">导入</el-button>
        <el-button :icon="Download" size="small" @click="exportVisible = true">导出{{ selectedBom ? `(${selectedBom.bomCode})` : '' }}</el-button>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <div class="split-panel page-shell__section">
      <!-- 左侧：BOM 列表 -->
      <div class="split-panel__left" style="width: 420px; min-width: 420px;">
        <div class="panel-header">
          <span class="panel-header__title">BOM列表</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showBomDialog()">新增</el-button>
        </div>
        <div class="panel-search">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索编码 / 产品名称"
            clearable
            :prefix-icon="Search"
            size="small"
            @keyup.enter="fetchBomList"
          />
        </div>
        <div class="bom-table-area" v-loading="bomLoading">
          <el-table
            ref="bomTableRef"
            :data="bomList"
            highlight-current-row
            size="small"
            @current-change="handleBomSelect"
          >
            <el-table-column prop="materialName" label="产品名称" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.materialName }}</span>
                <el-badge v-if="row.hintCount > 0" :value="row.hintCount" :max="9" class="bom-hint-badge" />
              </template>
            </el-table-column>
            <el-table-column prop="bomCode" label="BOM编码" width="100" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="60" align="center" />
            <el-table-column label="子项" width="50" align="center">
              <template #default="{ row }">{{ row.itemCount }}</template>
            </el-table-column>
            <el-table-column label="状态" width="60" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="left">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" link size="small" @click.stop="showBomDialog(row)">编辑</el-button>
                  <el-button type="danger" link size="small" @click.stop="handleDeleteBom(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无BOM" :image-size="60" />
            </template>
          </el-table>
        </div>
      </div>

      <!-- 右侧：BOM 结构树 -->
      <div class="split-panel__right">
        <template v-if="selectedBom">
          <div class="panel-header">
            <span class="panel-header__title">{{ selectedBom.materialName }} — BOM结构</span>
          </div>

          <!-- 变更提示栏 -->
          <div v-if="selectedBomHints.length" class="bom-hint-bar">
            <el-alert type="warning" :closable="false" show-icon>
              <template #title>{{ selectedBomHints.length }} 个引用物料的BOM已更新</template>
              <template #default>
                <div v-for="hint in selectedBomHints" :key="hint.id" class="hint-item">
                  <span>{{ hint.materialName }}（{{ hint.materialCode }}）已更新</span>
                  <el-button type="primary" link size="small" @click="handleSync(hint)">同步</el-button>
                </div>
                <el-button type="info" link size="small" style="margin-top: 4px" @click="handleDismissHints">全部忽略</el-button>
              </template>
            </el-alert>
          </div>

          <!-- 产品信息卡 -->
          <div class="bom-info-card">
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">物料编码</span>
              <span>{{ selectedBom.materialCode }}</span>
            </div>
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">产品名称</span>
              <span>{{ selectedBom.materialName }}</span>
            </div>
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">规格</span>
              <span>{{ selectedBom.spec || '-' }}</span>
            </div>
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">BOM编码</span>
              <span>{{ selectedBom.bomCode }}</span>
            </div>
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">版本</span>
              <span>{{ selectedBom.version }}</span>
            </div>
            <div class="bom-info-card__row">
              <span class="bom-info-card__label">状态</span>
              <el-tag :type="selectedBom.status ? 'success' : 'info'" size="small">{{ selectedBom.status ? '启用' : '停用' }}</el-tag>
            </div>
          </div>

          <!-- BOM 结构树 -->
          <div class="bom-tree-area" v-loading="treeLoading">
            <el-tree
              v-if="treeData.length"
              :data="treeData"
              :props="treeProps"
              default-expand-all
              node-key="key"
              :indent="28"
            >
              <template #default="{ data }">
                <div class="bom-node">
                  <div :class="['bom-node__icon', materialIconClass(data.material.type)]">
                    <el-icon><Document /></el-icon>
                  </div>
                  <div class="bom-node__info">
                    <div class="bom-node__name">{{ data.material.name }}</div>
                    <div class="bom-node__code">{{ data.material.code }}</div>
                  </div>
                  <div class="bom-node__meta">
                    <el-tag v-if="data.material.type" :type="materialTypeTag(data.material.type)" size="small">{{ data.material.type }}</el-tag>
                    <el-tag v-if="data.supplyType" type="info" size="small">{{ data.supplyType }}</el-tag>
                    <span class="bom-node__qty">用量: {{ data.quantity }} {{ data.unit }}</span>
                    <span v-if="data.lossRate > 0" class="bom-node__loss">损耗 {{ data.lossRate }}%</span>
                  </div>
                </div>
              </template>
            </el-tree>
            <el-empty v-else description="暂无子件" :image-size="60" />
          </div>
        </template>
        <el-empty v-else description="请从左侧选择一个BOM" :image-size="120" class="empty-placeholder" />
      </div>
    </div>

    <!-- 新增/编辑 BOM 弹窗 -->
    <el-dialog
      v-model="bomDialogVisible"
      :title="editingBom ? '编辑BOM' : '新增BOM'"
      width="900px"
      :close-on-click-modal="false"
      @closed="handleBomDialogClosed"
    >
      <el-form ref="bomFormRef" :model="bomForm" :rules="bomRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="BOM编码" prop="bomCode">
              <el-input v-model="bomForm.bomCode" placeholder="如 BOM-003" :disabled="!!editingBom" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="母件物料" prop="materialId">
              <el-select
                v-model="bomForm.materialId"
                filterable
                placeholder="搜索并选择物料"
                style="width: 100%"
              >
                <el-option
                  v-for="m in allMaterialList"
                  :key="m.id"
                  :label="`${m.materialName} (${m.materialCode})`"
                  :value="m.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="版本">
              <el-input v-model="bomForm.version" placeholder="如 V1.0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="bomForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="bomForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
        </el-form-item>

        <!-- 多级子件明细 — 卡片式树形 -->
        <el-divider content-position="left">BOM物料清单</el-divider>
        <div class="bom-edit-list">
          <template v-for="item in flatEditItems" :key="item._uid">
            <div class="bom-edit-row" :style="{ paddingLeft: (item._level - 1) * 32 + 12 + 'px' }">
              <!-- 展开/收起箭头 -->
              <div
                class="bom-edit-row__toggle"
                :class="{ 'is-leaf': !item._hasChildren }"
                @click="toggleExpand(item)"
              >
                <el-icon v-if="item._hasChildren" :class="{ 'is-expanded': item._expanded }">
                  <CaretRight />
                </el-icon>
              </div>

              <!-- 彩色图标 -->
              <div :class="['bom-node__icon', 'bom-node__icon--sm', materialIconClassById(item.materialId)]">
                <el-icon><Document /></el-icon>
              </div>

              <!-- 物料选择器 + 编码 -->
              <div class="bom-edit-row__material">
                <el-select
                  v-model="item.materialId"
                  filterable
                  placeholder="选择物料"
                  size="default"
                  style="width: 100%"
                  @change="(val) => handleItemMaterialChange(item, val)"
                >
                  <el-option
                    v-for="m in allMaterialList"
                    :key="m.id"
                    :label="`${m.materialName} (${m.materialCode})`"
                    :value="m.id"
                  />
                </el-select>
                <div v-if="item.materialId" class="bom-edit-row__matcode">
                  {{ getMaterialCode(item.materialId) }}
                </div>
              </div>

              <!-- 用量 -->
              <div class="bom-edit-row__field">
                <span class="bom-edit-row__label">用量:</span>
                <el-input-number
                  v-model="item.quantity"
                  :min="0"
                  :precision="2"
                  :controls="true"
                  size="small"
                  style="width: 100px"
                />
                <span class="bom-edit-row__unit">{{ item.unit || '件' }}</span>
              </div>

              <!-- 损耗率 -->
              <div class="bom-edit-row__field">
                <span class="bom-edit-row__label">+损耗</span>
                <el-input-number
                  v-model="item.lossRate"
                  :min="0"
                  :max="100"
                  :precision="1"
                  :controls="false"
                  size="small"
                  style="width: 50px"
                />
                <span class="bom-edit-row__unit">%</span>
              </div>

              <div class="bom-edit-row__field bom-edit-row__field--supply">
                <span class="bom-edit-row__label">供应:</span>
                <el-select v-model="item.supplyType" size="small" style="width: 92px">
                  <el-option v-for="option in supplyTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
              </div>

              <!-- 操作 -->
              <div class="bom-edit-row__actions">
                <el-button v-if="item.level < 10" :icon="Plus" circle size="small" @click="addChildItem(item)" title="添加子件" />
                <el-button :icon="Delete" circle size="small" type="danger" plain @click="removeItem(item)" title="删除" />
              </div>
            </div>
          </template>
          <div v-if="!flatEditItems.length" class="bom-edit-empty">
            暂无物料，请点击下方按钮添加
          </div>
        </div>
        <div style="margin-top: 12px; padding-left: 12px;">
          <el-button type="primary" text :icon="Plus" @click="addItem">添加一级物料</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="bomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBom">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入弹窗 -->
    <ImportDialog
      v-model="importVisible"
      title="导入BOM"
      :columns="importColumns"
      template-file-name="BOM导入模板"
      :import-fn="importBom"
      @success="fetchBomList"
    />

    <ExportDialog
      v-model="exportVisible"
      title="导出BOM结构"
      :fields="exportFields"
      :allow-selected="false"
      :current-page-count="treeData.length"
      :total-count="treeData.length"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Upload, Download, Delete, CaretRight, Document } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { runDialogExport } from '@/utils/exportDialog'
import { getNextCode } from '@/api/codeRule'
import {
  getBomList, getBomDetail, getBomTree, createBom, updateBom, deleteBom,
  getMaterialList, importBom,
  checkMaterialBom, getBomItemsByMaterial, getBomHints, dismissBomHints, syncBomFromMaterial
} from '@/api/basicData'

// ========== BOM 列表 ==========

const bomTableRef = ref(null)
const bomList = ref([])
const bomLoading = ref(false)
const selectedBom = ref(null)
const searchKeyword = ref('')

async function fetchBomList() {
  bomLoading.value = true
  try {
    const params = {}
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await getBomList(params)
    bomList.value = res.data.list || []
    if (selectedBom.value) {
      const still = bomList.value.find(b => b.id === selectedBom.value.id)
      if (still) {
        selectedBom.value = still
      } else {
        selectedBom.value = null
        treeData.value = []
        selectedBomHints.value = []
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    bomLoading.value = false
  }
}

function handleBomSelect(row) {
  selectedBom.value = row || null
  if (row) {
    fetchBomTree(row.id)
    fetchHints(row.id)
  } else {
    treeData.value = []
    selectedBomHints.value = []
  }
}

function refreshAll() {
  searchKeyword.value = ''
  selectedBom.value = null
  treeData.value = []
  selectedBomHints.value = []
  bomTableRef.value?.setCurrentRow()
  fetchBomList()
}

// ========== BOM 结构树 ==========

const treeLoading = ref(false)
const treeData = ref([])
const treeProps = { children: 'children', label: 'label' }

let treeKeyCounter = 0

function flattenTree(items) {
  if (!items || !items.length) return []
  return items.map(item => ({
    key: `node-${treeKeyCounter++}`,
    label: item.material.name,
    material: item.material,
    quantity: item.quantity,
    unit: item.unit || '',
    lossRate: item.lossRate || 0,
    supplyType: item.supplyType || item.material?.sourceType || '',
    children: item.children ? flattenTree(item.children)
      : (item.childBom ? flattenTree(item.childBom.items) : [])
  }))
}

async function fetchBomTree(id) {
  treeLoading.value = true
  try {
    treeKeyCounter = 0
    const res = await getBomTree(id)
    const data = res.data || {}
    treeData.value = flattenTree(data.items || [])
  } catch (e) {
    console.error(e)
    treeData.value = []
  } finally {
    treeLoading.value = false
  }
}

function materialTypeTag(type) {
  const map = { '原材料': '', '半成品': 'warning', '成品': 'success' }
  return map[type] || 'info'
}

function materialIconClass(type) {
  if (type === '原材料') return 'bom-node__icon--raw'
  if (type === '半成品') return 'bom-node__icon--semi'
  if (type === '成品') return 'bom-node__icon--finish'
  return 'bom-node__icon--default'
}

function materialIconClassById(materialId) {
  if (!materialId) return 'bom-node__icon--default'
  const mat = allMaterialList.value.find(m => m.id === materialId)
  return mat ? materialIconClass(mat.materialType) : 'bom-node__icon--default'
}

function getMaterialCode(materialId) {
  const mat = allMaterialList.value.find(m => m.id === materialId)
  return mat ? mat.materialCode : ''
}

function getMaterialSourceType(materialId) {
  const mat = allMaterialList.value.find(m => m.id === materialId)
  return mat ? (mat.sourceType || '') : ''
}

const supplyTypeOptions = [
  { label: '自制', value: '自制' },
  { label: '采购', value: '采购' },
  { label: '委外', value: '委外' }
]

// ========== 变更提示 ==========

const selectedBomHints = ref([])

async function fetchHints(bomId) {
  try {
    const res = await getBomHints(bomId)
    selectedBomHints.value = res.data || []
  } catch (e) {
    selectedBomHints.value = []
  }
}

async function handleSync(hint) {
  try {
    await ElMessageBox.confirm(
      `确定将「${hint.materialName}」的子件同步为最新BOM内容？这将替换当前BOM中该物料下的所有子件。`,
      '同步确认', { confirmButtonText: '同步', cancelButtonText: '取消', type: 'warning' }
    )
    await syncBomFromMaterial(selectedBom.value.id, hint.materialId)
    ElMessage.success('同步成功')
    fetchBomTree(selectedBom.value.id)
    fetchHints(selectedBom.value.id)
    fetchBomList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

async function handleDismissHints() {
  try {
    await dismissBomHints(selectedBom.value.id)
    selectedBomHints.value = []
    fetchBomList()
  } catch (e) {
    console.error(e)
  }
}

// ========== 辅助数据 ==========

const allMaterialList = ref([])

async function fetchMaterials() {
  try {
    const res = await getMaterialList({ pageSize: 9999 })
    allMaterialList.value = res.data.list || res.data || []
  } catch (e) {
    console.error(e)
  }
}

// ========== 新增/编辑弹窗 ==========

const bomDialogVisible = ref(false)
const editingBom = ref(null)
const bomFormRef = ref(null)

let uidCounter = 0
function genUid() { return `item-${++uidCounter}` }

function newItem(level = 1) {
  return {
    _uid: genUid(),
    _expanded: true,
    materialId: null,
    quantity: 1,
    unit: '',
    supplyType: '',
    lossRate: 0,
    remark: '',
    level,
    children: []
  }
}

function defaultBomForm() {
  return {
    bomCode: '',
    materialId: null,
    version: 'V1.0',
    status: 1,
    remark: '',
    items: []
  }
}
const bomForm = ref(defaultBomForm())

const bomRules = {
  bomCode: [{ required: true, message: '请输入BOM编码', trigger: 'blur' }],
  materialId: [{ required: true, message: '请选择母件物料', trigger: 'change' }]
}

function mapItemsWithUids(items, level = 1) {
  return (items || []).map(i => ({
    _uid: genUid(),
    _expanded: true,
    materialId: i.materialId,
    materialCode: i.materialCode || '',
    materialName: i.materialName || '',
    quantity: i.quantity,
    unit: i.unitName || i.unit || '',
    supplyType: i.supplyType || i.material?.sourceType || '',
    lossRate: i.lossRate || 0,
    level,
    remark: i.remark || '',
    children: i.children ? mapItemsWithUids(i.children, level + 1) : []
  }))
}

function flattenForEdit(items) {
  const result = []
  for (const item of items) {
    item._level = item.level || 1
    item._hasChildren = Array.isArray(item.children) && item.children.length > 0
    if (item._expanded === undefined) item._expanded = true
    result.push(item)
    if (item._hasChildren && item._expanded !== false) {
      result.push(...flattenForEdit(item.children))
    }
  }
  return result
}

const flatEditItems = computed(() => flattenForEdit(bomForm.value.items))

function toggleExpand(item) {
  if (!item._hasChildren) return
  item._expanded = !item._expanded
}

function findItemByUid(arr, uid) {
  for (const item of arr) {
    if (item._uid === uid) return item
    if (item.children) {
      const found = findItemByUid(item.children, uid)
      if (found) return found
    }
  }
  return null
}

async function showBomDialog(row) {
  if (!allMaterialList.value.length) await fetchMaterials()

  editingBom.value = row || null
  if (row) {
    try {
      const res = await getBomDetail(row.id)
      const data = res.data || {}
      bomForm.value = {
        bomCode: data.bomCode || '',
        materialId: data.materialId,
        version: data.version || 'V1.0',
        status: data.status ?? 1,
        remark: data.remark || '',
        items: mapItemsWithUids(data.items || [])
      }
    } catch (e) {
      console.error(e)
      bomForm.value = { ...defaultBomForm(), bomCode: row.bomCode }
    }
  } else {
    bomForm.value = defaultBomForm()
    getNextCode('bom').then(res => {
      if (res.data?.preview) bomForm.value.bomCode = res.data.preview
    }).catch(() => {})
  }
  bomDialogVisible.value = true
}

function handleBomDialogClosed() {
  bomFormRef.value?.resetFields()
  editingBom.value = null
}

async function handleItemMaterialChange(item, materialId) {
  const mat = allMaterialList.value.find(m => m.id === materialId)
  if (mat) {
    item.unit = mat.unitName || ''
    item.supplyType = mat.sourceType || ''
  }

  try {
    const res = await checkMaterialBom(materialId)
    if (res.data && res.data.hasBom) {
      const confirmed = await ElMessageBox.confirm(
        `该物料已有BOM（${res.data.bomCode}，${res.data.itemCount}个子件），是否引用其子件？`,
        '引用BOM子件',
        { confirmButtonText: '引用', cancelButtonText: '不引用', type: 'info' }
      ).catch(() => false)

      if (confirmed !== false) {
        const itemsRes = await getBomItemsByMaterial(materialId)
        if (itemsRes.data && itemsRes.data.length) {
          item.children = mapItemsWithUids(itemsRes.data, item.level + 1)
          item._expanded = true
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

function addItem() {
  bomForm.value.items.push(newItem(1))
}

function addChildItem(item) {
  if (!item.children) item.children = []
  item.children.push(newItem(item.level + 1))
  item._expanded = true
}

function removeItem(target) {
  function removeFromArray(arr, uid) {
    const idx = arr.findIndex(i => i._uid === uid)
    if (idx >= 0) { arr.splice(idx, 1); return true }
    for (const item of arr) {
      if (item.children && removeFromArray(item.children, uid)) return true
    }
    return false
  }
  removeFromArray(bomForm.value.items, target._uid)
}

function serializeItems(items) {
  return items
    .filter(i => i.materialId && i.quantity > 0)
    .map(i => ({
      materialId: i.materialId,
      quantity: i.quantity,
      unit: i.unit || '',
      supplyType: i.supplyType || getMaterialSourceType(i.materialId),
      lossRate: i.lossRate || 0,
      remark: i.remark || '',
      children: i.children ? serializeItems(i.children) : []
    }))
}

async function saveBom() {
  try {
    await bomFormRef.value.validate()

    const payload = {
      bomCode: bomForm.value.bomCode,
      materialId: bomForm.value.materialId,
      version: bomForm.value.version,
      status: bomForm.value.status,
      remark: bomForm.value.remark,
      items: serializeItems(bomForm.value.items)
    }

    if (editingBom.value) {
      await updateBom(editingBom.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createBom(payload)
      ElMessage.success('添加成功')
    }
    bomDialogVisible.value = false
    await fetchBomList()
    if (selectedBom.value) {
      fetchBomTree(selectedBom.value.id)
      fetchHints(selectedBom.value.id)
    }
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

// ========== 删除 ==========

async function handleDeleteBom(row) {
  try {
    await ElMessageBox.confirm(`确定删除BOM「${row.bomCode}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteBom(row.id)
    ElMessage.success('删除成功')
    if (selectedBom.value?.id === row.id) {
      selectedBom.value = null
      treeData.value = []
      selectedBomHints.value = []
    }
    await fetchBomList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ========== 导入/导出 ==========

const importVisible = ref(false)
const exportVisible = ref(false)

const importColumns = [
  { key: 'bomCode', label: 'BOM编码', required: true, example: 'BOM-001', note: '同一BOM的行填同一编码' },
  { key: 'parentMaterialCode', label: '母件物料编码', required: true, example: 'MAT-010', note: '第一行必须填写' },
  { key: 'level', label: '层级', required: true, example: '1', note: '1=一级子件, 2=二级...' },
  { key: 'materialCode', label: '子件物料编码', required: true, example: 'MAT-008' },
  { key: 'materialName', label: '子件名称', example: '控制板组件' },
  { key: 'quantity', label: '用量', required: true, example: '2' },
  { key: 'unit', label: '单位', example: '件', note: '不填则自动取物料单位' },
  { key: 'supplyType', label: '供应方式', example: '采购', note: '不填则取物料档案来源方式', enum: ['自制', '采购', '委外'] },
  { key: 'lossRate', label: '损耗率(%)', example: '0' },
  { key: 'remark', label: '备注', example: '' }
]

const exportFields = [
  { key: 'bomCode', label: 'BOM编码' },
  { key: 'parentMaterialCode', label: '母件物料编码' },
  { key: 'level', label: '层级' },
  { key: 'materialCode', label: '子件物料编码' },
  { key: 'materialName', label: '子件名称' },
  { key: 'quantity', label: '用量' },
  { key: 'unit', label: '单位' },
  { key: 'supplyType', label: '供应方式' },
  { key: 'lossRate', label: '损耗率(%)' },
  { key: 'remark', label: '备注', default: false }
]

function getBomExportRows() {
  if (!selectedBom.value) {
    return []
  }
  if (!treeData.value.length) {
    return []
  }

  const rows = []
  function flattenWithLevel(items, level = 1) {
    for (const item of items) {
      rows.push({
        bomCode: selectedBom.value.bomCode,
        parentMaterialCode: selectedBom.value.materialCode,
        level,
        materialCode: item.material?.code || '',
        materialName: item.material?.name || '',
        quantity: item.quantity,
        unit: item.unit || '',
        supplyType: item.supplyType || '',
        lossRate: item.lossRate || 0,
        remark: item.remark || ''
      })
      if (item.children?.length) flattenWithLevel(item.children, level + 1)
    }
  }
  flattenWithLevel(treeData.value)
  return rows
}

async function handleExport({ scope, fields }) {
  if (!selectedBom.value) {
    ElMessage.warning('请先选择要导出的BOM')
    return
  }
  await runDialogExport({
    scope,
    fields,
    allFields: exportFields,
    currentRows: getBomExportRows(),
    fetchAll: async () => getBomExportRows(),
    fileName: `BOM_${selectedBom.value.bomCode}`
  })
}

onMounted(() => {
  fetchBomList()
  fetchMaterials()
})
</script>

<style lang="scss" scoped>
.split-panel {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.split-panel__left {
  background: var(--bg-card);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-panel__right {
  flex: 1;
  min-width: 0;
  background: var(--bg-card);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-lighter);
}

.panel-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-search {
  padding: 8px 12px;
}

.bom-table-area {
  flex: 1;
  overflow: auto;
  padding: 0 8px 8px;
}

.bom-hint-badge {
  margin-left: 6px;
  vertical-align: middle;
}

.bom-hint-bar {
  padding: 12px 16px 0;

  .hint-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
    color: var(--text-regular);
  }
}

.bom-info-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  padding: 16px;
  border-bottom: 1px solid var(--border-lighter);

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-regular);
  }

  &__label {
    color: var(--text-light);
    flex-shrink: 0;

    &::after {
      content: ':';
    }
  }
}

// ========== 只读树节点 ==========

.bom-tree-area {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

:deep(.el-tree-node__content) {
  height: auto !important;
  padding: 4px 0;
}

.bom-node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 4px 0;
  flex: 1;
  min-width: 0;
}

.bom-node__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  font-size: 18px;

  &--raw {
    background: rgba(var(--primary-color-rgb), 0.85);
  }

  &--semi {
    background: rgba(230, 162, 60, 0.85);
  }

  &--finish {
    background: rgba(103, 194, 58, 0.85);
  }

  &--default {
    background: var(--text-secondary);
  }

  &--sm {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    font-size: 15px;
  }
}

.bom-node__info {
  flex: 1;
  min-width: 0;
}

.bom-node__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bom-node__code {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.bom-node__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-regular);
}

.bom-node__qty {
  white-space: nowrap;
}

.bom-node__loss {
  color: #e6a23c;
  font-weight: 500;
  white-space: nowrap;
}

// ========== 编辑弹窗 — 卡片式树行 ==========

.bom-edit-list {
  border: 1px solid var(--border-lighter);
  border-radius: 8px;
  padding: 4px 0;
  max-height: 380px;
  overflow-y: auto;
  background: var(--bg-color);
}

.bom-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 12px;
  margin: 0 8px;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-card);
  }

  & + .bom-edit-row {
    border-top: 1px solid var(--border-lighter);
  }

  &__toggle {
    width: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: transform 0.2s;

    &.is-leaf {
      visibility: hidden;
    }

    .el-icon {
      transition: transform 0.2s;

      &.is-expanded {
        transform: rotate(90deg);
      }
    }
  }

  &__material {
    flex: 1;
    min-width: 180px;
    max-width: 260px;
  }

  &__matcode {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
    padding-left: 12px;
    line-height: 1.2;
  }

  &__field {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;

    &--supply {
      width: 136px;
    }
  }

  &__label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  &__unit {
    font-size: 12px;
    color: var(--text-regular);
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
  }
}

.bom-edit-empty {
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-placeholder {
  margin: auto;
}
</style>
