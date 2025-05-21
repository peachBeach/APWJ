// 微信消息模板配置（通过环境变量注入实际值）
module.exports = {
  ORDER_COMPLETE: {
    id: process.env.TPL_ORDER_COMPLETE || 'k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo',
    fields: {
      orderNumber: 'character_string1',
      completeTime: 'time3',
      remark: 'thing4'
    }
  },
  ORDER_CANCEL: {
    id: process.env.TPL_ORDER_CANCEL || 'q-et-4UMkENK1C1-dgFxkWlWZ3w4N9WMK779BQTdCKw',
    fields: {
      orderNumber: 'character_string1', 
      cancelReason: 'thing2',
      cancelTime: 'time3'
    }
  },
  ORDER_ACCEPTED: {
    id: process.env.TPL_ORDER_ACCEPTED || '5uekBbznU7y8e39__dE9Zg0WQr4af5B1JKOuIZIqd40',
    fields: {
      orderNumber: 'character_string1',
      masterName: 'name2',
      acceptTime: 'time3'
    }
  }
};
