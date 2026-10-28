<template>
  <div class="image-preview">
    <el-image
      v-for="(url, index) in urls"
      :key="index"
      :src="url"
      :preview-src-list="urls"
      :initial-index="index"
      fit="cover"
      class="preview-image"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  src: {
    type: [String, Array],
    required: true
  }
})

const urls = computed(() => {
  return Array.isArray(props.src) ? props.src : [props.src]
})
</script>

<style lang="scss" scoped>
.image-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .preview-image {
    width: 100px;
    height: 100px;
    border-radius: 4px;
    cursor: pointer;
  }
}
</style>
