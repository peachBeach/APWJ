// Token使用示例（安全版）
const { getAccessToken } = require('../server/wechatTokenService');

async function safelyUseToken() {
  try {
    // 获取token（实际使用时自动处理）
    const token = await getAccessToken();
    
    // 模拟安全使用（不打印完整token）
    console.log('Token获取成功！');
    console.log('前4位:', token.slice(0, 4));
    console.log('后4位:', token.slice(-4));
    console.log('长度:', token.length);
    
    // 实际API调用示例
    // const apiResponse = await callWeChatAPI(token);
    return true;
  } catch (error) {
    console.error('Token处理失败:', error.message);
    return false;
  }
}

// 执行验证
safelyUseToken();
