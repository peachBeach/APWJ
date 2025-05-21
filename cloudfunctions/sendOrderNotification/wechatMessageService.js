const cloud = require('wx-server-sdk')
const templates = require('./config/msgTemplates')

// 带重试的消息发送
async function sendWithRetry(messageData, retryCount = 0) {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: messageData.touser,
      template_id: messageData.template_id,
      page: messageData.page || '',
      data: messageData.data
    })

    if (result.errCode !== 0) {
      throw new Error(`微信API错误: ${result.errMsg}`);
    }
    
    return true;
  } catch (error) {
    if (retryCount < 2) { // 最多重试2次
      await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
      return sendWithRetry(messageData, retryCount + 1);
    }
    throw error;
  }
}

// 优化后的消息发送
async function sendOrderUpdate(orderData, msgType) {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=== 消息推送调试开始 ===');
    console.log('消息类型:', msgType);
  }
  
  // 验证数据
  if (!orderData?.user?.openid) {
    const errMsg = '订单缺少用户openid';
    console.error(`❌ ${errMsg}`, { orderId: orderData?.id });
    throw new Error(errMsg);
  }

  const template = templates[msgType];
  if (!template) {
    const errMsg = `无效的消息类型: ${msgType}`;
    console.error(`❌ ${errMsg}`, { validTypes: Object.keys(templates) });
    throw new Error(errMsg);
  }

  // 构建请求数据
  const requestData = {
    touser: orderData.user.openid,
    template_id: template.id,
    page: `/pages/order/detail?id=${orderData.id}`,
    data: buildTemplateData(template.fields, orderData)
  };

  try {
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] 消息请求:', {
        type: msgType,
        orderId: orderData.id,
        templateId: template.id,
        user: requestData.touser.slice(0, 3) + '****',
        dataKeys: Object.keys(requestData.data)
      });
    }

    // 发送消息（带重试）
    await sendWithRetry(requestData);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] 消息发送成功 orderId=${orderData.id}`);
    }
    return true;
  } catch (error) {
    const errMsg = `消息发送失败 [orderId=${orderData.id}, type=${msgType}]: ${error.message}`;
    if (process.env.NODE_ENV !== 'production') {
      console.error(errMsg);
    }
    throw new Error(errMsg);
  }
}

// 保留原有辅助函数...

// 构建模板数据
function buildTemplateData(fields, orderData) {
  return Object.entries(fields).reduce((result, [key, field]) => {
    const value = orderData[key];
    if (value === undefined || value === null) {
      console.warn(`[模板数据] 字段缺失 key=${key}, field=${field}`);
    }
    result[field] = { value: value || '' };
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
