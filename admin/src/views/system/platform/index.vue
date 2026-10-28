<template>
  <div class="platform-config-container page-shell" v-loading="loading">
    <PageHeader
      title="平台配置"
      description="配置平台名称、Logo、页脚等品牌信息，修改后实时生效"
      class="page-shell__section"
    />

    <el-row :gutter="20" class="page-grid page-shell__section">
      <el-col :xs="24" :lg="14">
        <el-card class="config-card page-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon primary"><Setting /></el-icon>
              <span class="header-title">基础配置</span>
            </div>
          </template>

          <el-form :model="configForm" :rules="rules" ref="formRef" label-width="100px">
            <el-form-item label="平台全称" prop="fullName">
              <el-input v-model="configForm.fullName" placeholder="用于浏览器标题、登录页等">
                <template #prefix><el-icon><Document /></el-icon></template>
              </el-input>
              <div class="form-tip">显示在浏览器标签页和登录页面</div>
            </el-form-item>

            <el-form-item label="平台简称" prop="shortName">
              <el-input v-model="configForm.shortName" placeholder="用于侧边栏Logo区域">
                <template #prefix><el-icon><Tickets /></el-icon></template>
              </el-input>
              <div class="form-tip">显示在侧边栏Logo旁边</div>
            </el-form-item>

            <el-form-item label="导航标签" prop="navLabel">
              <el-input v-model="configForm.navLabel" placeholder="顶部导航显示的标签">
                <template #prefix><el-icon><PriceTag /></el-icon></template>
              </el-input>
              <div class="form-tip">显示在顶部导航栏的标签</div>
            </el-form-item>

            <el-form-item label="登录副标题">
              <el-input v-model="configForm.loginSubtitle" placeholder="留空则不显示">
                <template #prefix><el-icon><Tickets /></el-icon></template>
              </el-input>
              <div class="form-tip">显示在登录页标题下方，可留空隐藏</div>
            </el-form-item>

            <el-divider content-position="left">Logo 配置</el-divider>

            <el-form-item label="平台Logo">
              <ImageUpload v-model="configForm.logo" :limit="1" />
              <div class="form-tip">建议尺寸：200x200px，支持 PNG、JPG 格式</div>
            </el-form-item>

            <el-divider content-position="left">页脚配置</el-divider>

            <el-form-item label="公司名称" prop="companyName">
              <el-input v-model="configForm.companyName" placeholder="版权所属公司">
                <template #prefix><el-icon><OfficeBuilding /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item label="版权年份" prop="copyrightYear">
              <el-input v-model="configForm.copyrightYear" placeholder="如：2026">
                <template #prefix><el-icon><Calendar /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item label="ICP备案号">
              <el-input v-model="configForm.icp" placeholder="如：京ICP备XXXXXXXX号">
                <template #prefix><el-icon><Connection /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-divider content-position="left">主题配置</el-divider>

            <el-form-item label="主题色">
              <div class="color-picker-wrapper">
                <el-color-picker v-model="configForm.primaryColor" />
                <span class="color-value">{{ configForm.primaryColor }}</span>
                <el-button type="primary" link @click="resetColor">重置默认</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveConfig" :loading="saving">
                <el-icon><Check /></el-icon> 保存配置
              </el-button>
              <el-button @click="resetConfig">
                <el-icon><RefreshRight /></el-icon> 恢复默认
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card class="preview-card page-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon success"><View /></el-icon>
              <span class="header-title">实时预览</span>
            </div>
          </template>

          <!-- 浏览器标签预览 -->
          <div class="preview-section">
            <div class="preview-label">浏览器标签</div>
            <div class="browser-tab-preview">
              <div class="tab">
                <el-icon class="tab-icon"><Grid /></el-icon>
                <span class="tab-title">{{ configForm.fullName || '平台名称' }}</span>
                <el-icon class="close-icon"><Close /></el-icon>
              </div>
            </div>
          </div>

          <div class="preview-section" v-if="configForm.loginSubtitle">
            <div class="preview-label">登录页副标题</div>
            <div class="footer-preview">
              {{ configForm.loginSubtitle }}
            </div>
          </div>

          <!-- 侧边栏Logo预览 -->
          <div class="preview-section">
            <div class="preview-label">侧边栏Logo</div>
            <div class="sidebar-preview">
              <div class="logo-box" v-if="configForm.logo">
                <img :src="configForm.logo" alt="Logo" class="logo">
              </div>
              <div class="logo-box placeholder" v-else>
                <el-icon><Picture /></el-icon>
              </div>
              <span class="sidebar-title">{{ configForm.shortName || '管理系统' }}</span>
            </div>
          </div>

          <!-- 导航栏标签预览 -->
          <div class="preview-section" v-if="configForm.navLabel">
            <div class="preview-label">导航栏标签</div>
            <div class="nav-label-preview">
              <span class="nav-tag active">{{ configForm.navLabel }}</span>
              <span class="nav-tag">管理员</span>
            </div>
          </div>

          <!-- 页脚版权预览 -->
          <div class="preview-section">
            <div class="preview-label">页脚版权</div>
            <div class="footer-preview">
              {{ configForm.fullName || '平台名称' }} © {{ configForm.copyrightYear || '2026' }} {{ configForm.companyName || '公司名称' }}
            </div>
          </div>
        </el-card>

        <!-- 配置说明 -->
        <el-card class="tips-card page-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon info"><InfoFilled /></el-icon>
              <span class="header-title">配置说明</span>
            </div>
          </template>

          <ul class="tips-list">
            <li>
              <el-icon class="tip-icon"><Select /></el-icon>
              <span>配置保存后 <a href="javascript:;" class="link">立即生效</a>，无需重启</span>
            </li>
            <li>
              <el-icon class="tip-icon"><Select /></el-icon>
              <span>配置存储在服务端数据库，<a href="javascript:;" class="link">多端同步生效</a></span>
            </li>
            <li>
              <el-icon class="tip-icon"><Select /></el-icon>
              <span>Logo支持上传图片或使用默认图标</span>
            </li>
            <li>
              <el-icon class="tip-icon"><Select /></el-icon>
              <span>点击"恢复默认"可还原初始配置</span>
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/store/app'
import { getPlatformConfig, updatePlatformConfig } from '@/api/system'
import {
  Setting, View, Check, RefreshRight, Document, Tickets, PriceTag,
  OfficeBuilding, Calendar, Connection, Close, Picture, Grid,
  InfoFilled, Select
} from '@element-plus/icons-vue'
import ImageUpload from '@/components/ImageUpload/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'

const appStore = useAppStore()
const formRef = ref()
const saving = ref(false)
const loading = ref(false)

const DEFAULT_CONFIG = {
  fullName: '后台管理系统',
  shortName: '管理系统',
  navLabel: '控制台',
  logo: '',
  loginSubtitle: '统一配置与业务协同平台',
  companyName: '微品科技',
  copyrightYear: '2026',
  icp: '',
  primaryColor: '#409EFF'
}

const configForm = reactive({ ...DEFAULT_CONFIG })

const rules = {
  fullName: [{ required: true, message: '请输入平台全称', trigger: 'blur' }],
  shortName: [{ required: true, message: '请输入平台简称', trigger: 'blur' }],
  companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  copyrightYear: [{ required: true, message: '请输入版权年份', trigger: 'blur' }]
}

const applyConfig = (config = {}) => {
  Object.assign(configForm, DEFAULT_CONFIG, config)
}

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getPlatformConfig()
    applyConfig(res.data)
    appStore.updatePlatformConfig(res.data)
  } catch (error) {
    ElMessage.error('加载平台配置失败')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = { ...configForm }
      await updatePlatformConfig(payload)
      appStore.updatePlatformConfig(payload)
      ElMessage.success('配置保存成功')
    } catch (error) {
      ElMessage.error('配置保存失败')
    } finally {
      saving.value = false
    }
  })
}

const resetConfig = async () => {
  applyConfig(DEFAULT_CONFIG)
  try {
    await updatePlatformConfig({ ...DEFAULT_CONFIG })
    appStore.updatePlatformConfig(DEFAULT_CONFIG)
    ElMessage.success('已恢复默认配置')
  } catch (error) {
    ElMessage.error('恢复默认配置失败')
  }
}

const resetColor = () => {
  configForm.primaryColor = DEFAULT_CONFIG.primaryColor
  appStore.updatePlatformConfig({ primaryColor: configForm.primaryColor })
  ElMessage.success('已重置为默认主题色')
}

onMounted(() => {
  loadConfig()
})
</script>

<style lang="scss" scoped>
.platform-config-container {
  // 卡片头部
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;

    .header-icon {
      font-size: 18px;

      &.primary {
        color: var(--primary-color);
      }

      &.success {
        color: var(--success-color);
      }
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  // 表单提示
  .form-tip {
    font-size: 12px;
    color: var(--text-light);
    margin-top: 6px;
  }

  // 颜色选择器
  .color-picker-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;

    .color-value {
      font-size: 14px;
      font-family: monospace;
      color: var(--text-secondary);
    }
  }

  // 预览卡片
  .preview-card {
    // position: sticky; // 移除 sticky 避免遮挡
    // top: 16px;
  }

  .preview-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .preview-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    // 浏览器标签预览 - 更真实
    .browser-tab-preview {
      background: var(--bg-color);
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-color);

      .tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--bg-card);
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        max-width: 100%;

        .tab-icon {
          font-size: 14px;
          color: var(--primary-color);
        }

        .tab-title {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .close-icon {
          font-size: 12px;
          color: var(--text-light);
          cursor: pointer;

          &:hover {
            color: var(--text-secondary);
          }
        }
      }
    }

    // 侧边栏预览 - 深色背景更真实
    .sidebar-preview {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border-radius: 10px;

      .logo-box {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        overflow: hidden;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        &.placeholder {
          background: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.6);
          font-size: 18px;
        }
      }

      .sidebar-title {
        font-size: 17px;
        font-weight: 600;
        color: #fff;
        letter-spacing: 0.5px;
      }
    }

    // 导航标签预览 - 胶囊样式
    .nav-label-preview {
      display: flex;
      gap: 10px;

      .nav-tag {
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 13px;
        background: var(--bg-hover);
        color: var(--text-secondary);
        transition: all 0.2s;

        &.active {
          background: var(--primary-color);
          color: #fff;
        }
      }
    }

    // 页脚预览
    .footer-preview {
      padding: 16px;
      text-align: center;
      background: var(--bg-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-light);
    }
  }
}

// 输入框图标颜色
:deep(.el-input__prefix) {
  color: var(--text-light);
}

// 配置说明卡片
.tips-card {
  margin-top: 16px;

  .header-icon.info {
    color: var(--primary-color);
  }
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;

    &:not(:last-child) {
      border-bottom: 1px dashed var(--border-light);
    }

    .tip-icon {
      color: var(--success-color);
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .link {
      color: var(--primary-color);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
