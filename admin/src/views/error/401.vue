<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">401</div>
      <div class="error-desc">抱歉，您没有权限访问此页面</div>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.error-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--bg-color);

  .error-content {
    text-align: center;

    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: var(--primary-color);
      line-height: 1;
      margin-bottom: 20px;
    }

    .error-desc {
      font-size: 20px;
      color: var(--text-secondary);
      margin-bottom: 30px;
    }
  }
}
</style>
