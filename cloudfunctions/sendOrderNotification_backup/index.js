const cloud = require('wx-server-sdk')
// 初始化云环境
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 10000 // 10秒超时
})

const db = cloud.database()
const { sendOrderUpdate, MESSAGE_TYPES } = require('./wechatMessageService')

// 初始化集合缓存
let collectionsCache = {}
let isInitialized = false

// 初始化集合检查
async function initializeCollections() {
  if (isInitialized) return;
  
  try {
    await Promise.all([
      db.collection('orders').count().catch(() => db.createCollection('orders')),
      db.collection('message_logs').count().catch(() => db.createCollection('message_logs'))
    ]);
    isInitialized = true;
  } catch (err) {
    console.error('集合初始化失败:', err);
    throw err;
  }
}

// 消息类型验证
const validateMessageType = (type) => {
  if (!MESSAGE_TYPES.includes(type)) {
    throw new Error(`无效的消息类型: ${type}`)
  }
}

// 预处理消息数据
const preprocessMessageData = (type, data) => {
  switch(type) {
    case 'ORDER_ACCEPTED':
      return {
        ...data,
        appointmentTime: formatTimestamp(data.appointmentTime)
      }
    case 'ORDER_CANCELLED':
      return {
        ...data,
        cancelTime: formatTimestamp(Date.now())
      }
    default:
      return data
  }
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${padZero(date.getMonth()+1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`
}

function padZero(num) {
  return num < 10 ? `0${num}` : num
}

exports.main = async (event, context) => {
  try {
    // 基础参数验证
    const { orderId, type, data } = event;
    if (!orderId || !type || !data) {
      return { code: 400, message: '缺少必要参数' };
    }

    // 仅执行核心操作
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) {
      return { code: 404, message: '订单不存在' };
    }

    // 验证订单数据完整性
    if (!orderRes.data.openid) {
      console.error('订单数据缺少openid:', orderRes.data);
      return { code: 400, message: '订单数据不完整' };
    }

    // 立即返回，异步处理后续操作
    setTimeout(async () => {
      console.log('开始异步消息处理，订单ID:', orderId);
      try {
        console.log('准备发送消息，模板类型:', type);
        console.log('订单用户openid:', orderRes.data.openid);
        console.log('调用微信API参数:', {
          openid: orderRes.data.openid,
          templateType: type,
          orderData: data
        });
        // 消息发送重试逻辑
        const maxRetries = 3;
        let result = false;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`尝试发送消息(第${attempt}次)`);
            result = await cloud.callFunction({
              name: 'sendWechatMessage',
              data: {
                openid: orderRes.data.openid,
                templateType: type,
                orderData: {
                  id: orderId,
                  ...data
                }
              }
            });
            
            if (result) break;
          } catch (err) {
            lastError = err;
            console.error(`第${attempt}次发送失败:`, err);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        if (!result) {
          // 最终失败时触发备用通知
          await db.collection('pending_notifications').add({
            data: {
              openid: orderRes.data.openid,
              type,
              orderId,
              data,
              createTime: db.serverDate(),
              lastError: lastError?.message
            }
          });
          console.error('消息发送最终失败，已存入待处理队列');
        }
        console.log('微信API响应结果:', result);
        
        console.log('消息发送结果:', result ? '成功' : '失败');
        await db.collection('message_logs').add({
          data: {
            orderId,
            type,
            openid: orderRes.data.openid,
            status: result ? 'success' : 'failed',
            createTime: db.serverDate(),
            templateId: getTemplateId(type),
            isAsync: true,
            debugInfo: {
              apiCalledAt: new Date().toISOString()
            }
          }
        });
        console.log('消息日志记录完成');
      } catch (err) {
        console.error('异步消息发送失败:', err);
        await db.collection('message_logs').add({
          data: {
            orderId,
            type,
            openid: orderRes.data.openid,
            status: 'failed',
            createTime: db.serverDate(),
            templateId: getTemplateId(type),
            error: err.message,
            isAsync: true,
            debugInfo: {
              failedAt: new Date().toISOString(),
              stack: err.stack
            }
          }
        });
        console.error('失败日志记录完成');
      }
    }, 0);

    return {
      code: 0,
      message: '消息处理已开始',
      data: { orderId }
    };
  } catch (err) {
    console.error('处理失败:', err);
    return {
      code: 500,
      message: '服务器错误',
      error: err.message
    };
  }
}

// 获取模板ID
function getTemplateId(type) {
  const templates = require('./config/msgTemplates')
  return templates[type]?.id || 'unknown'
}
