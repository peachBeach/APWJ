
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { orderId, status } = event
    
    // 参数校验
    if (!orderId || ![0, 1, 2, 3].includes(status)) {
      return { code: 400, message: '参数不合法' }
    }

    // 获取订单信息
    const orderRes = await db.collection('orders').doc(orderId).get()
    if (!orderRes.data) {
      return { code: 404, message: '订单不存在' }
    }
    const order = orderRes.data

    // 更新订单状态
    const res = await db.collection('orders').doc(orderId).update({
      data: {
        status: status,
        updateTime: db.serverDate()
      }
    })

    if (res.stats.updated === 0) {
      return { code: 404, message: '订单状态未变更' }
    }

    // 根据不同状态发送对应的通知
    try {
      let notificationType = null;
      let notificationData = null;

      switch (status) {
        case 1: // 接单
          notificationType = 'ORDER_ACCEPTED';
          notificationData = {
            serviceName: '安平五金上门维修',
            technicianName: '维修师傅',
            appointmentTime: Date.now(),
            contactPhone: '13915157035' // 维修小哥固定电话
          };
          break;
        
        case 2: // 完成
          notificationType = 'ORDER_COMPLETED';
          notificationData = {
            serviceName: '安平五金上门维修',
            rating: '5',
            comment: '维修已完成，感谢您的信任'
          };
          break;
        
        case 3: // 取消
          notificationType = 'ORDER_CANCELLED';
          notificationData = {
            serviceName: '安平五金上门维修',
            cancelReason: '用户取消订单',
            contactPhone: order.phone || ''
          };
          break;
      }

      if (notificationType) {
        const notificationResult = await cloud.callFunction({
          name: 'sendOrderNotification',
          data: {
            type: notificationType,
            orderId: orderId,
            data: notificationData
          }
        });

        if (notificationResult.result.code !== 0) {
          console.error('发送状态变更通知失败:', notificationResult.result.message);
          cloud.logger().warn('状态变更通知发送失败', {
            orderId,
            status,
            error: notificationResult.result.message
          });
        } else {
          cloud.logger().log('状态变更通知发送成功', {
            orderId,
            status,
            notificationId: notificationResult.result.data
          });
        }
      }
    } catch (notifyError) {
      console.error('发送状态变更通知异常:', notifyError);
      cloud.logger().error('状态变更通知异常', {
        orderId,
        status,
        error: notifyError.message,
        stack: notifyError.stack
      });
      // 通知发送失败不影响主流程
    }

    return { 
      code: 0, 
      message: '更新成功',
      data: {
        orderId,
        newStatus: status
      }
    }
  } catch (err) {
    console.error('更新订单状态失败:', err)
    return { 
      code: 500, 
      message: '服务器错误',
      error: err 
    }
  }
}