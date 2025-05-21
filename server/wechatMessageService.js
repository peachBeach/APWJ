const { getAccessToken } = require('./wechatTokenService');

// 微信订阅消息模板ID（需在公众平台配置）
const TEMPLATE_ID = process.env.WX_TEMPLATE_ID; 

const templates = require('../config/msgTemplates');

async function sendOrderUpdate(orderData, msgType) {
  // 验证订单数据
  if (!orderData?.user?.openid) {
    throw new Error('订单缺少用户openid');
  }

  // 获取对应模板
  const template = templates[msgType];
  if (!template) {
    throw new Error('无效的消息类型');
  }

  const accessToken = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

  const data = {
    touser: orderData.user.openid,
    template_id: template.id,
    page: `/pages/orderDetail?id=${orderData.id}`,
    data: buildTemplateData(template.fields, orderData)
  };
  };

  try {
    // 开发环境打印调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== 订阅消息调试信息 ===');
      console.log('接收者:', data.touser.slice(0, 3) + '****' + data.touser.slice(-3));
      console.log('模板ID:', data.template_id);
      console.log('跳转路径:', data.page);
      console.log('消息数据:', JSON.stringify(data.data, null, 2));
    }

    const response = await axios.post(url, data);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('微信API响应:', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        msgid: response.data.msgid ? '****' + response.data.msgid.slice(-4) : null
      });
    }

    if (response.data.errcode !== 0) {
      throw new Error(`消息发送失败: ${response.data.errmsg}`);
    }
    
    // 调试日志已移除
    return true;
  } catch (error) {
    if (error) {
      console.error(`❌ 订单${orderData.id}消息发送失败:`, error.message);
    }
    return false;
  }
}

// 构建模板数据
function buildTemplateData(fields, orderData) {
  return Object.entries(fields).reduce((result, [key, field]) => {
    result[field] = { value: orderData[key] || '' };
    return result;
  }, {});
}

module.exports = { 
  sendOrderUpdate,
  MESSAGE_TYPES: Object.keys(templates)
};
