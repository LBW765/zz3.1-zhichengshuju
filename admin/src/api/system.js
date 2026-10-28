import request from '@/utils/request'

// 获取平台配置
export function getPlatformConfig() {
  return request({
    url: '/system/platform/config',
    method: 'get'
  })
}

// 更新平台配置
export function updatePlatformConfig(data) {
  return request({
    url: '/system/platform/config',
    method: 'put',
    data
  })
}

// 上传文件
export function uploadFile(data) {
  return request({
    url: '/system/upload',
    method: 'post',
    data
  })
}
