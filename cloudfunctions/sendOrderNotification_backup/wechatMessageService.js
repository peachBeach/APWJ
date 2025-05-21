const axios = require('axios');
const { getAccessToken } = require('./wechatTokenService');
const templates = require('./config/msgTemplates');

// 带重试的消息发送
async function sendWithRetry(data, retryCount = 0) {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    // 设置超时（2.5秒）
    const response = await Promise.race([
      axios.post(url, data, { timeout: 2500 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API请求超时')), 2500)
      )
    ]);

    if (response.data.errcode !== 0) {
      throw new Error(`微信API错误: ${response.data.errmsg}`);
    }
    
    return true;
  } catch (error) {
    if (retryCount < 2) { // 最多重试2次
      await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
      return sendWithRetry(data, retryCount + 1);
    }
    throw error;
  }
}

// 优化后的消息发送
async function sendOrderUpdate(orderData, msgType) {
  console.log('\n=== 消息推送调试开始 ===');
  console.log('消息类型:', msgType);
  
  // 验证数据
  if (!orderData?.user?.openid) {
    console.error('❌ 订单缺少用户openid');
    throw new Error('订单缺少用户openid');
  }

  const template = templates[msgType];
  if (!template) {
    console.error('❌ 无效的消息类型:', msgType);
    throw new Error('无效的消息类型');
  }

  // 构建请求数据
  const requestData = {
    touser: orderData.user.openid,
    template_id: template.id,
    page: `/pages/orderDetail?id=${orderData.id}`,
    data: buildTemplateData(template.fields, orderData)
  };

  try {
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log('请求数据:', JSON.stringify({
        ...requestData,
        touser: requestData.touser.slice(0, 3) + '****'
      }, null, 2));
    }

    // 发送消息（带重试）
    const result = await sendWithRetry(requestData);
    console.log(`✅ 订单${orderData.id}消息发送成功`);
    return result;
  } catch (error) {
    console.error(`❌ 订单${orderData.id}消息发送失败:`, error.message);
    return false;
  }
}

// 保留原有辅助函数...

// 构建模板数据
function buildTemplateData(fields, orderData) {
  return Object.entries(fields).reduce((result, [key, field]) => {
    result[field] = { value: orderData[key] || '' };
    return result;
  }, {});
}

// 格式化预约时间
function formatAppointmentTime(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${padZero(date.getMonth()+1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function padZero(num) {
  return num < 10 ? `0${num}` : num;
}

module.exports = { 
  sendOrderUpdate,
  MESSAGE_TYPES: Object.keys(templates)
};
