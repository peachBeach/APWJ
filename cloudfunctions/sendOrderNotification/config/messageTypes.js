// 消息类型定义
const MESSAGE_TYPES = {
  // 订单创建成功通知
  ORDER_CREATED: 'ORDER_CREATED',
  // 订单接单成功通知
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  // 订单完成通知
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  // 订单取消通知
  ORDER_CANCELLED: 'ORDER_CANCELLED'
};

// 消息类型验证
function isValidMessageType(type) {
  return Object.values(MESSAGE_TYPES).includes(type);
}

module.exports = {
  MESSAGE_TYPES,
  isValidMessageType
};