<template>
  <div class="file-upload">
    <el-upload
      :action="uploadUrl"
      :on-success="handleSuccess"
      :on-remove="handleRemove"
      :before-upload="beforeUpload"
      :limit="limit"
      :on-exceed="handleExceed"
      :file-list="fileList"
      :headers="headers"
    >
      <el-button type="primary">
        <el-icon><Upload /></el-icon>
        点击上传
      </el-button>
      <template #tip>
        <div class="el-upload__tip">
          只能上传文件大小不超过{{ fileSize }}MB
        </div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import Cookies from 'js-cookie'

const props = defineProps({
  modelValue: {
    type: [String, Array],
    default: ''
  },
  limit: {
    type: Number,
    default: 5
  },
  fileSize: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue'])

const uploadUrl = computed(() => `${import.meta.env.VITE_APP_BASE_API}/system/upload`)
const headers = computed(() => {
  const token = Cookies.get('Admin-Token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})
const fileList = ref([])

const getFileUrl = (item) => item?.response?.data?.url || item?.response?.url || item?.url || ''

const handleSuccess = (response, file, fileList) => {
  const urls = fileList.map(getFileUrl).filter(Boolean)
  emit('update:modelValue', props.limit === 1 ? (urls[0] || '') : urls)
}

const handleRemove = (file, fileList) => {
  const urls = fileList.map(getFileUrl).filter(Boolean)
  emit('update:modelValue', props.limit === 1 ? (urls[0] || '') : urls)
}

const beforeUpload = (file) => {
  const isLtSize = file.size / 1024 / 1024 < props.fileSize
  if (!isLtSize) {
    ElMessage.error(`上传文件大小不能超过 ${props.fileSize}MB!`)
    return false
  }
  return true
}

const handleExceed = () => {
  ElMessage.warning(`最多只能上传 ${props.limit} 个文件`)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const urls = Array.isArray(val) ? val : [val]
      fileList.value = urls.map(url => ({ url, name: url.split('/').pop() }))
    } else {
      fileList.value = []
    }
  },
  { immediate: true }
)
</script>
