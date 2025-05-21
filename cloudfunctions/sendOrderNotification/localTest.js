// 本地模拟测试环境
console.log("=== 安平五金维修云函数本地测试 ===");

const mockData = {
  orderId: `test_${Date.now()}`,
  address: "安平五金测试地址",
  contactPhone: "13800138000",
  createTime: Date.now(),
  serviceName: "五金维修服务"
};

// 模拟云函数返回结果
const mockResult = {
  code: 0,
  message: "本地测试成功",
  data: {
    templateId: "mock_template_id",
    sendStatus: "success",
    orderInfo: mockData
  }
};

console.log("测试数据:", JSON.stringify(mockData, null, 2));
console.log("模拟结果:", JSON.stringify(mockResult, null, 2));
console.log("=== 测试完成 ===");
