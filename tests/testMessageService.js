const { sendOrderUpdate } = require('../server/wechatMessageService');
const { getAccessToken } = require('../server/wechatTokenService');

// 测试配置（使用测试环境变量）
process.env.WX_TEMPLATE_ID = '测试模板ID'; 
process.env.WX_APP_ID = '测试APPID';
process.env.WX_APP_SECRET = '测试APPSECRET';

async function testMessageFlow() {
  console.log('=== 开始消息服务测试 ===');
  
  // 测试1: 验证access_token获取
  try {
    const token = await getAccessToken();
    console.log('✅ Token获取成功:', token.slice(0, 4) + '****' + token.slice(-4));
  } catch (error) {
    console.error('❌ Token获取失败:', error.message);
    return;
  }

  // 测试2: 模拟消息发送
  const testData = {
    orderNumber: 'TEST2023',
    id: '0001'
  };
  
  console.log('\n模拟发送消息...');
  const result = await sendOrderUpdate('测试用OPENID', testData);
  
  if (result) {
    console.log('✅ 消息发送流程验证通过');
    console.log('注意：实际发送需要有效的openid和模板ID');
  } else {
    console.error('❌ 消息发送失败');
    console.log('可能原因：\n1. 模板ID无效\n2. openid未订阅\n3. 网络问题');
  }
}

// 执行测试
testMessageFlow();
