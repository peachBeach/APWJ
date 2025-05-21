const cloud = require('wx-server-sdk')
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV 
})

// 支持的消息类型处理器
const messageHandlers = {
  // 文本消息
  text: async (event) => {
    const { Content, FromUserName } = event
    console.log('处理文本消息:', Content)
    
    await cloud.openapi.customerServiceMessage.send({
      touser: FromUserName,
      msgtype: 'text',
      text: {
        content: `已收到您的消息：${Content}`
      }
    })
    
    return 'success'
  },
  
  // 图片消息
  image: async (event) => {
    const { PicUrl, FromUserName } = event
    console.log('处理图片消息:', PicUrl)
    
    await cloud.openapi.customerServiceMessage.send({
      touser: FromUserName,
      msgtype: 'text',
      text: {
        content: '已收到您发送的图片'
      }
    })
    
    return 'success'
  },
  
  // 小程序卡片
  miniprogrampage: async (event) => {
    console.log('处理小程序卡片消息:', event.Title)
    return 'success'
  },
  
  // 事件消息
  event: async (event) => {
    const { Event, FromUserName } = event
    console.log('处理事件消息:', Event)
    
    // 处理不同类型事件
    switch(Event) {
      case 'user_enter_tempsession':
        await handleUserEnterSession(FromUserName)
        break
      case 'subscribe_msg_popup':
        await handleSubscribeMsgEvent(event)
        break
    }
    
    return 'success'
  }
}

exports.main = async (event) => {
  try {
    const { MsgType, Event } = event
    
    // 记录完整消息内容(敏感信息需脱敏)
    console.log('收到消息推送:', {
      ...event,
      FromUserName: event.FromUserName?.slice(0, 3) + '****',
      ToUserName: event.ToUserName?.slice(0, 3) + '****'
    })

    // 判断是消息还是事件
    const handlerKey = Event ? 'event' : MsgType
    const handler = messageHandlers[handlerKey] || messageHandlers.text
    
    return await handler(event)
  } catch (err) {
    console.error('消息处理失败:', err)
    return 'success'
  }
}

// 用户进入客服会话处理
async function handleUserEnterSession(openid) {
  await cloud.openapi.customerServiceMessage.send({
    touser: openid,
    msgtype: 'text',
    text: {
      content: '您好，请问有什么可以帮您？'
    }
  })
}

// 订阅消息事件处理
async function handleSubscribeMsgEvent(event) {
  // 处理用户订阅消息相关事件
  console.log('订阅消息事件:', event)
}
