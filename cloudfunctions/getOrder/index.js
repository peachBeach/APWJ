
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-8gjn6lhxe97aa6b5' });

exports.main = async (event, context) => {
  const { id } = event;
  const wxContext = cloud.getWXContext();

  try {
    const result = await cloud.database().collection('orders')
      .doc(id)
      .get();
    
    if (result.data) {
      return { 
        code: 0, 
        data: result.data,
        message: '获取订单成功' 
      };
    } else {
      return { 
        code: -1, 
        message: '订单不存在' 
      };
    }
  } catch (err) {
    return { 
      code: -1, 
      message: '获取订单失败: ' + err.message 
    };
  }
};
