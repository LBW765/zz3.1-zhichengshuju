<template>
  <div class="page-header">
    <div class="header-content">
      <h1 class="title">{{ title }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
    <div v-if="$slots.extra" class="header-extra page-header-actions">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<style lang="scss" scoped>
.page-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light, #66b1ff));
  border-radius: 12px;
  padding: 24px 28px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .header-content {
    min-width: 0;

    .title {
      font-size: 22px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 8px 0;
    }

    .description {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      margin: 0;
    }
  }

  .header-extra {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-left: auto;

    :deep(.el-button--primary) {
      border: 1px solid rgba(255, 255, 255, 0.3);

      &:hover {
        border-color: rgba(255, 255, 255, 0.5);
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 20px;

    .header-extra {
      margin-left: 0;
    }
  }
}
</style>
