
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { orderId, init = false } = event
    
    // 初始化逻辑
    if (init) {
      await db.collection('orders').doc(orderId).set({
        data: {
          isRead: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      return {
        code: 0,
        message: '订单阅读状态初始化成功'
      }
    }
    
    // 更新订单已读状态
    await db.collection('orders').doc(orderId).update({
      data: {
        isRead: true,
        updateTime: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '订单已读状态更新成功'
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: '订单已读状态更新失败',
      error: err
    }
  }
}
