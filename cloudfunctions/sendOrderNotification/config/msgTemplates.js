module.exports = {
  // 订单创建成功消息模板
  ORDER_CREATED: {
    id: 'd0HiMwqgQa3Qyi8M0Jb-8IoJklJhlf0j0opoOGfwjvk',
    fields: {
      createTime: 'time10',
      orderId: 'character_string22',
      address: 'thing25',
      status: 'phrase28',
      contactPhone: 'phone_number54'
    }
  },

  // 接单成功消息模板
  ORDER_ACCEPTED: {
    id: 'k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo',
    fields: {
      orderId: 'character_string1',
      serviceName: 'thing2',
      technicianName: 'name3',
      appointmentTime: 'date4',
      contactPhone: 'phone_number5'
    }
  },
  
  // 订单完成消息模板
  ORDER_COMPLETED: {
    id: 'q-et-4UMkENK1C1-dgFxkWlWZ3w4N9WMK779BQTdCKw',
    fields: {
      orderId: 'character_string1',
      serviceName: 'thing2',
      rating: 'number3',
      comment: 'thing4'
    }
  },

  // 订单取消消息模板  
  ORDER_CANCELLED: {
    id: '5uekBbznU7y8e39__dE9Zg0WQr4af5B1JKOuIZIqd40',
    fields: {
      orderId: 'character_string1',
      serviceName: 'thing2',
      cancelReason: 'thing3',
      contactPhone: 'phone_number4'
    }
  }
}