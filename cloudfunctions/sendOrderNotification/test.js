const cloud = require('wx-server-sdk');
const main = require('./index').main;

// 初始化云开发环境
cloud.init({
  env: 'cloud1-8gjn6lhxe97aa6b5',
  traceUser: true
});

// 完整的测试事件数据
const testEvent = {
  type: 'ORDER_CREATED',
  orderId: 'test_' + Date.now(),
  data: {
    address: '安平五金测试地址',
    contactPhone: '13800138000',
    createTime: Date.now(),
    status: 'created',
    serviceName: '五金维修服务'
  }
};

// 执行测试
main(testEvent)
  .then(res => console.log('测试成功:', JSON.stringify(res, null, 2)))
  .catch(err => console.error('测试失败:', err.message));
