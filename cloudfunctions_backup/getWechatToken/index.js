const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  try {
    // 从数据库获取配置
    const db = cloud.database()
    const config = await db.collection('config').doc('wechat_api').get()
    if (!config.data) {
      throw new Error('微信API配置未设置')
    }
    const appid = config.data.appid
    const secret = config.data.secret
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`

    console.log('准备调用微信API获取token, URL:', url.replace(secret, '******'))
    const res = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url,
        method: 'GET',
        timeout: 5000
      }
    })

    console.log('微信API响应:', JSON.stringify(res.result || {}))
    
    if (!res.result) {
      throw new Error('httpRequest返回结果为空')
    }
    
    if (res.result.errcode) {
      throw new Error(`微信API错误: ${res.result.errmsg} (${res.result.errcode})`)
    }
    
    if (!res.result.access_token) {
      throw new Error('响应缺少access_token字段')
    }

    return {
      code: 0,
      message: 'success',
      access_token: res.result.access_token,
      expires_in: res.result.expires_in
    }
  } catch (err) {
    console.error('获取微信token失败:', err)
    return {
      code: -1,
      message: err.message
    }
  }
}
