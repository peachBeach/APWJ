
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    // 获取微信上下文
    const wxContext = cloud.getWXContext()
    
    // 返回用户标识信息
    return {
      errcode: 0,
      errmsg: 'ok',
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID || '',
      env: wxContext.ENV
    }
  } catch (err) {
    console.error('云函数执行失败:', err)
    return {
      errcode: -1,
      errmsg: '云函数执行失败',
      error: err.message
    }
  }
}
