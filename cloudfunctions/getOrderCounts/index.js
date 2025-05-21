
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  
  // 查询所有订单状态统计
  const [pendingRes, processingRes, completedRes, canceledRes] = await Promise.all([
    db.collection('orders').where({
      status: 0
    }).count(),
    db.collection('orders').where({
      status: 1
    }).count(),
    db.collection('orders').where({
      status: 2
    }).count(),
    db.collection('orders').where({
      status: 3
    }).count()
  ])

  return {
    pending: pendingRes.total || 0,
    processing: processingRes.total || 0,
    completed: completedRes.total || 0,
    canceled: canceledRes.total || 0
  }
}
