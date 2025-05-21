const axios = require('axios');
const cache = require('memory-cache');

// 从环境变量获取配置（安全）
const APP_ID = process.env.WX_APP_ID;
const APP_SECRET = process.env.WX_APP_SECRET;
const CACHE_KEY = 'wx_access_token';

// 获取access_token（带缓存）
async function getAccessToken() {
  // 检查缓存
  const cachedToken = cache.get(CACHE_KEY);
  if (cachedToken) return cachedToken;

  // 调用微信API
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  
  try {
    const response = await axios.get(url);
    const { access_token, expires_in } = response.data;
    
    // 缓存token（提前5分钟过期）
    cache.put(CACHE_KEY, access_token, (expires_in - 300) * 1000);
    return access_token;
  } catch (error) {
    console.error('获取token失败:', error.response?.data);
    throw new Error('微信服务不可用');
  }
}

module.exports = { getAccessToken };
