const cloud = require('wx-server-sdk');
const templates = require('./config/msgTemplates');

// 临时Token生成器
const generateTempToken = () => {
  const prefix = 'TEMP_';
  const randomStr = Math.random().toString(36).substr(2, 12);
  return prefix + randomStr + '_' + Date.now().toString(36);
};

// 测试环境配置
const isTestEnv = process.env.NODE_ENV === 'test' || !process.env.WX_CLOUD_API_TOKEN;

// 强制检查wxCloudApiToken
const requiredToken = process.env.WX_CLOUD_API_TOKEN;
if (!requiredToken) {
  throw new Error('必须配置WX_CLOUD_API_TOKEN环境变量');
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  traceUser: true,
  throwOnNotFound: false,
  wxCloudApiToken: requiredToken,
  secretId: process.env.SECRET_ID || 'default_secret_id',
  secretKey: process.env.SECRET_KEY || 'default_secret_key',
  signatureMethod: 'HmacSHA1'
});

// 记录当前使用的Token类型
if (!process.env.WX_CLOUD_API_TOKEN) {
  cloud.logger().warn('使用临时Token，仅限开发环境测试使用');
}
const logger = cloud.logger({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 格式化时间戳
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// 格式化模板数据
function formatTemplateData(type, data) {
  const formatters = {
    ORDER_CREATED: (d) => ({
      time10: { value: formatTimestamp(d.createTime) },
      character_string22: { value: d.orderId },
      thing25: { value: d.address },
      phrase28: { value: '下单成功' },
      phone_number54: { value: d.contactPhone }
    }),
    ORDER_ACCEPTED: (d) => ({
      character_string1: { value: d.orderId },
      thing2: { value: d.serviceName },
      name3: { value: d.technicianName },
      date4: { value: formatTimestamp(d.appointmentTime) },
      phone_number5: { value: d.contactPhone }
    }),
    ORDER_COMPLETED: (d) => ({
      character_string1: { value: d.orderId },
      thing2: { value: d.serviceName },
      number3: { value: d.rating || '5' },
      thing4: { value: (d.comment || '维修已完成').slice(0, 20) }
    }),
    ORDER_CANCELLED: (d) => ({
      character_string1: { value: d.orderId },
      thing2: { value: d.serviceName },
      thing3: { value: (d.cancelReason || '用户取消').slice(0, 20) },
      phone_number4: { value: d.contactPhone }
    })
  };

  const formatter = formatters[type];
  if (!formatter) {
    console.error(`未找到消息类型[${type}]的格式化器`);
    return data;
  }

  try {
    const formattedData = formatter(data);
    logger.info({
      message: '格式化消息数据完成',
      data: {
        type,
        fields: Object.keys(formattedData)
      }
    });
    return formattedData;
  } catch (error) {
    logger.error({
      message: '格式化消息数据失败',
      data: {
        type,
        error: error.message
      }
    });
    throw error;
  }
}

// 发送订阅消息
async function sendSubscribeMessage(openid, templateId, data) {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: templateId,
      data: data,
      miniprogramState: 'formal' // 正式版
    });
    logger.info({
      message: '发送订阅消息成功',
      data: {
        templateId,
        openid: openid.slice(0, 3) + '...' + openid.slice(-3)
      }
    });
    return result;
  } catch (error) {
    logger.error({
      message: '发送订阅消息失败',
      data: {
        templateId,
        error: error.message
      }
    });
    throw error;
  }
}

// 获取或创建测试订单信息
// 检查集合是否存在
async function checkCollectionExists(collectionName) {
  try {
    const res = await db.collection(collectionName).limit(1).get();
    return true;
  } catch (error) {
    if (error.errCode === 'DATABASE_COLLECTION_NOT_EXIST') {
      return false;
    }
    throw error;
  }
}

async function getOrderInfo(orderId, data = {}) {
  try {
    // 如果是测试订单且不存在，则自动创建
    if (orderId.startsWith('test_')) {
      // 检查集合是否存在
      const collectionExists = await checkCollectionExists('orders');
      if (!collectionExists) {
        throw new Error('orders集合不存在，请先创建集合');
      }
      const result = await db.collection('orders').doc(orderId).get();
      if (!result.data) {
        const testOrder = {
          _id: orderId,
          openid: 'test_openid',
          serviceName: '安平五金上门维修',
          createTime: Date.now(),
          status: 'created',
          ...(data || {})
        };
        await db.collection('orders').add({ 
          data: testOrder 
        });
        logger.info({
          message: '自动创建测试订单成功',
          orderId
        });
        return testOrder;
      }
      return result.data;
    }
    
    // 非测试订单正常查询
    const result = await db.collection('orders').doc(orderId).get();
    if (!result.data) {
      throw new Error(`订单 ${orderId} 不存在`);
    }
    return result.data;
  } catch (error) {
    logger.error({
      message: '获取订单信息失败',
      data: {
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
}

// 主函数
exports.main = async (event, context) => {
  const { type, orderId, data = {} } = event;
  logger.info({
      message: '收到发送通知请求',
      data: {
        type,
        orderId,
        dataKeys: Object.keys(data).filter(k => !k.includes('secret'))
      }
    });

  try {
    // 验证消息类型
    const template = templates[type];
    if (!template) {
      throw new Error(`未知的消息类型: ${type}`);
    }

    // 获取订单信息
    const order = await getOrderInfo(orderId, data);

    // 合并订单数据和传入的数据
    const messageData = {
      orderId: order._id,
      serviceName: '安平五金上门维修',
      ...data
    };

    // 格式化消息数据
    const formattedData = formatTemplateData(type, messageData);

    // 发送订阅消息
    const result = await sendSubscribeMessage(
      order.openid,
      template.id,
      formattedData
    );

    return {
      code: 0,
      message: '发送成功',
      data: result
    };

  } catch (error) {
    logger.error({
      message: '发送通知失败',
      data: {
        errorMessage: error.message,
        errorStack: error.stack
      }
    });
    return {
      code: -1,
      message: error.message || '发送失败'
    };
  }
};