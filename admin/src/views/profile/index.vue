<template>
  <div class="profile-container page-shell">
    <PageHeader
      title="个人中心"
      description="查看账号信息并维护基础资料与登录密码"
      class="page-shell__section"
    />

    <el-row :gutter="20" class="page-grid page-shell__section">
      <!-- 左侧个人信息卡片 -->
      <el-col :xs="24" :md="8">
        <el-card class="profile-card page-card">
          <div class="profile-header">
            <div class="avatar-wrapper" @click="triggerUpload">
              <el-avatar :size="100" :src="userInfo.avatar || defaultAvatar" />
              <div class="avatar-overlay">
                <el-icon :size="24"><Camera /></el-icon>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="avatar-file-input"
                @change="handleAvatarChange"
              />
            </div>
            <h3>{{ userInfo.nickName || userInfo.userName }}</h3>
            <p>{{ userInfo.roleName }}</p>
          </div>
          <el-divider />
          <div class="profile-info">
            <div class="info-item">
              <span class="label">用户名：</span>
              <span class="value">{{ userInfo.userName }}</span>
            </div>
            <div class="info-item">
              <span class="label">手机号：</span>
              <span class="value">{{ userInfo.phone || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">邮箱：</span>
              <span class="value">{{ userInfo.email || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">部门：</span>
              <span class="value">{{ userInfo.deptName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ userInfo.createTime }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧选项卡 -->
      <el-col :xs="24" :md="16">
        <el-card class="page-card">
          <el-tabs v-model="activeName">
            <el-tab-pane label="基本资料" name="basic">
              <el-form ref="profileFormRef" :model="form" :rules="profileRules" label-width="100px">
                <el-form-item label="昵称" prop="nickName">
                  <el-input v-model="form.nickName" />
                </el-form-item>
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="form.phone" />
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="form.email" />
                </el-form-item>
                <el-form-item label="性别">
                  <el-radio-group v-model="form.sex">
                    <el-radio value="男">男</el-radio>
                    <el-radio value="女">女</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="profileLoading" @click="handleUpdate">保存</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="修改密码" name="password">
              <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px">
                <el-form-item label="旧密码" prop="oldPassword">
                  <el-input v-model="passwordForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input v-model="passwordForm.newPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="passwordLoading" @click="handleUpdatePassword">保存</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { updateProfile, changePassword } from '@/api/user'
import { uploadFile } from '@/api/system'
import PageHeader from '@/components/PageHeader/index.vue'

const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

const userStore = useUserStore()
const activeName = ref('basic')
const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const fileInputRef = ref(null)
const profileLoading = ref(false)
const passwordLoading = ref(false)

const userInfo = computed(() => userStore.userInfo)

const form = reactive({
  nickName: userInfo.value.nickName || '',
  phone: userInfo.value.phone || '',
  email: userInfo.value.email || '',
  sex: userInfo.value.sex || '男'
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules = {
  nickName: [{ required: true, message: '请输入昵称', trigger: 'blur' }]
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 头像上传
const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleAvatarChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await uploadFile(formData)
    if (res.code === 200 && res.data?.url) {
      await updateProfile({
        nickName: form.nickName,
        phone: form.phone,
        email: form.email,
        sex: form.sex,
        avatar: res.data.url
      })
      await userStore.getInfo()
      ElMessage.success('头像更新成功')
    }
  } catch {
    ElMessage.error('头像上传失败')
  }

  // 清空 input 以便重复选择同一文件
  event.target.value = ''
}

// 保存基本资料
const handleUpdate = async () => {
  await profileFormRef.value.validate()
  profileLoading.value = true
  try {
    const res = await updateProfile({
      nickName: form.nickName,
      phone: form.phone,
      email: form.email,
      sex: form.sex,
      avatar: userInfo.value.avatar || ''
    })
    if (res.code === 200) {
      await userStore.getInfo()
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    profileLoading.value = false
  }
}

// 修改密码
const handleUpdatePassword = async () => {
  await passwordFormRef.value.validate()
  passwordLoading.value = true
  try {
    const res = await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    if (res.code === 200) {
      ElMessage.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch {
    ElMessage.error('修改失败')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.profile-container {
  .profile-card {
    .profile-header {
      text-align: center;
      padding: 20px 0;

      .avatar-wrapper {
        position: relative;
        display: inline-block;
        cursor: pointer;
        border-radius: 50%;

        .el-avatar {
          border: 3px solid var(--border-lighter);
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          opacity: 0;
          transition: opacity 0.2s;
        }

        &:hover .avatar-overlay {
          opacity: 1;
        }

        .avatar-file-input {
          display: none;
        }
      }

      h3 {
        margin: 15px 0 5px;
        font-size: 20px;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    .profile-info {
      .info-item {
        display: flex;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-lighter);

        &:last-child {
          border-bottom: none;
        }

        .label {
          width: 100px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .value {
          flex: 1;
          color: var(--text-primary);
          font-size: 14px;
        }
      }
    }
  }
}
</style>
