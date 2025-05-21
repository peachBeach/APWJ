const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const cache = {
  token: null,
  expireTime: 0
}

// 获取微信access_token
async function getAccessToken() {
  // 检查缓存有效性
  if (cache.token && Date.now() < cache.expireTime) {
    console.log('使用缓存的access_token')
    return cache.token
  }

  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`尝试获取access_token(第${retryCount + 1}次)`)
      const token = await fetchNewAccessToken()
      console.log('成功获取access_token')
      return token
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
  try {
    // 从数据库获取配置
    const config = await db.collection('config').doc('wechat_api').get()
    if (!config.data) {
      throw new Error('微信API配置未设置')
    }
    
    const { appid, secret } = config.data
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`

    console.log('调用微信API获取token, URL:', url.replace(secret, '******'))
    const res = await cloud.request({
      url,
      method: 'GET',
      timeout: 5000
    })

    if (res.statusCode !== 200 || !res.data.access_token) {
      throw new Error(res.data.errmsg || '获取token失败')
    }

    // 更新缓存
    cache.token = res.data.access_token
    cache.expireTime = Date.now() + (res.data.expires_in - 300) * 1000 // 提前5分钟过期

    return res.data.access_token
  } catch (err) {
    console.error('获取微信token失败:', err)
    throw err
  }
}

module.exports = {
  getAccessToken,
  // 兼容旧接口
  async getToken() {
    try {
      const token = await getAccessToken()
      return {
        code: 0,
        access_token: token,
        expires_in: Math.round((cache.expireTime - Date.now()) / 1000)
      }
    } catch (err) {
      return {
        code: -1,
        message: err.message
      }
    }
  }
}
