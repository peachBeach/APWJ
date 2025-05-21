
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  
  // 构建查询条件
  const where = {}
  if (event.status !== undefined) {
    where.status = event.status
  }

  // 添加日期范围查询
  if (event.startDate && event.endDate) {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    end.setHours(23, 59, 59, 999) // 包含当天
    
    where.createTime = db.command.and([
      db.command.gte(start),
      db.command.lte(end)
    ])
  }

  // 查询订单数据
  try {
    const res = await db.collection('orders')
      .where(where)
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      data: res.data
    }
  } catch (err) {
    console.error('查询订单失败:', err)
    return {
      data: []
    }
  }
}
