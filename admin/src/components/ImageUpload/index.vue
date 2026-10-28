<template>
  <div class="image-upload">
    <el-upload
      :action="uploadUrl"
      list-type="picture-card"
      :on-success="handleSuccess"
      :on-remove="handleRemove"
      :before-upload="beforeUpload"
      :limit="limit"
      :on-exceed="handleExceed"
      :file-list="fileList"
      :headers="headers"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>

    <el-dialog v-model="dialogVisible">
      <img :src="dialogImageUrl" alt="预览图片" style="width: 100%" />
    </el-dialog>
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
    default: 5
  }
})

const emit = defineEmits(['update:modelValue'])

const uploadUrl = computed(() => `${import.meta.env.VITE_APP_BASE_API}/system/upload`)
const headers = computed(() => {
  const token = Cookies.get('Admin-Token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
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
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < props.fileSize

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error(`上传图片大小不能超过 ${props.fileSize}MB!`)
    return false
  }
  return true
}

const handleExceed = () => {
  ElMessage.warning(`最多只能上传 ${props.limit} 张图片`)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const urls = Array.isArray(val) ? val : [val]
      fileList.value = urls.map(url => ({ url }))
    } else {
      fileList.value = []
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.image-upload {
  :deep(.el-upload--picture-card) {
    width: 100px;
    height: 100px;
    line-height: 100px;
  }

  :deep(.el-upload-list--picture-card .el-upload-list__item) {
    width: 100px;
    height: 100px;
  }
}
</style>
