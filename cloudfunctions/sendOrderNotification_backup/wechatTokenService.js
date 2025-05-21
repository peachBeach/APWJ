const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 获取微信access_token
async function getAccessToken() {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`尝试获取access_token(第${retryCount + 1}次)`)
      const { result } = await cloud.callFunction({
        name: 'getWechatToken'
      })
      
      if (!result) {
        throw new Error('getWechatToken返回结果为空')
      }
      
      if (result.errcode) {
        throw new Error(`微信接口错误: ${result.errmsg}`)
      }
      
      if (!result.access_token) {
        throw new Error('返回结果缺少access_token字段')
      }
      
      console.log('成功获取access_token')
      return result.access_token
    } catch (err) {
      retryCount++;
      console.error(`获取access_token失败(第${retryCount}次):`, err.message)
      
      if (retryCount >= maxRetries) {
        throw new Error(`获取access_token失败: ${err.message}`)
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

// 从微信API获取access_token
async function fetchNewAccessToken() {
  const { result } = await cloud.callFunction({
    name: 'getWechatToken'
  })
  
  if (!result || !result.access_token) {
    throw new Error('获取微信access_token失败')
  }
  
  return result.access_token
}

module.exports = {
  getAccessToken
}
