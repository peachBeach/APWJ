/**
 * @typedef {Object} MediaItem
 * @property {string} url - 媒体文件URL
 * @property {'image'|'video'} [type] - 媒体类型(默认image)
 */

/**
 * 添加报修订单云函数
 * @param {Object} event - 调用参数
 * @param {string} event.phone - 联系电话
 * @param {string} [event.locationName] - 位置名称
 * @param {string} [event.displayAddress] - 显示地址 
 * @param {string} [event.inputAddress] - 详细地址
 * @param {string} [event.problem] - 问题描述
 * @param {Object} event.location - 位置坐标
 * @param {number} event.location.latitude - 纬度
 * @param {number} event.location.longitude - 经度
 * @param {MediaItem[]} event.mediaList - 媒体文件列表
 * @returns {Promise<{code: number, data?: Object, message: string}>}
 */
const cloud = require('wx-server-sdk');
const { ErrorCode } = require('./errorCode');

// 初始化云开发环境
cloud.init({ 
  env: process.env.ENV_ID || 'cloud1-8gjn6lhxe97aa6b5' 
});

exports.main = async (event, context) => {
  // 解构获取前端传入的参数
  const { 
    phone,             // 联系电话
    locationName,      // 位置名称
    displayAddress,    // 显示地址
    inputAddress,      // 详细地址
    problem,           // 问题描述
    location,          // 位置坐标
    mediaList          // 媒体文件列表
  } = event;
  
  // 拼接完整地址
  const address = `${displayAddress || ''} ${inputAddress || ''}`.trim();
  const wxContext = cloud.getWXContext(); // 获取微信上下文

  // 打印完整订单数据（开发调试用）
  console.log('收到完整订单数据:', {
    phone,
    locationName,
    displayAddress,
    inputAddress,
    problem,
    location,
    mediaList
  });
  
  /** ========== 数据验证 ========== */
  // 1. 验证地址完整性
  // 参数校验
  if (!address || address.trim().length < 5) {
    return { 
      code: ErrorCode.INVALID_PARAMS, 
      message: '地址信息不完整(至少5个字符)' 
    };
  }
  
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    console.error('无效位置信息:', location);
    return {
      code: ErrorCode.INVALID_LOCATION,
      message: '请选择有效的位置坐标'
    };
  }

  if (!Array.isArray(mediaList) || mediaList.some(m => !m.url)) {
    console.error('无效媒体列表:', mediaList);
    return {
      code: ErrorCode.INVALID_MEDIA,
      message: '请上传有效的媒体文件'
    };
  }

  // 手机号脱敏处理
  const safePhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  try {
    /** ========== 数据格式化 ========== */
    // 1. 格式化位置数据
    const locationData = location && typeof location.latitude === 'number' && typeof location.longitude === 'number' 
      ? { latitude: location.latitude, longitude: location.longitude }
      : null;
    
    // 2. 格式化媒体文件数据
    const mediaListData = Array.isArray(mediaList) 
      ? mediaList.map(item => ({ 
          url: item.url, 
          type: item.type || 'image'  // 默认类型为图片
        }))
      : [];

    // 打印格式化后的数据（开发调试用）
    console.log('准备存储的完整数据:', {
      phone,
      locationName: locationName || '[空]',
      displayAddress: displayAddress || '[空]',
      detailAddress: inputAddress || '[空]',
      fullAddress: address,
      problem: problem || '[空]',
      location: locationData,
      mediaList: mediaListData,
      status: 0,
      createTime: cloud.database().serverDate(),
      updateTime: cloud.database().serverDate(),
      openid: wxContext.OPENID
    });

    /** ========== 构建订单数据 ========== */
    const orderData = {
      phone,                          // 联系电话
      locationName: locationName || '', // 位置名称
      displayAddress: displayAddress || '', // 显示地址
      detailAddress: inputAddress || '',  // 详细地址
      fullAddress: address,            // 完整地址
      problem: problem || '',          // 问题描述
      location: locationData,          // 位置坐标
      mediaList: mediaListData,        // 媒体文件
      status: 0,                       // 订单状态(0-未处理)
      createTime: cloud.database().serverDate(), // 创建时间
      updateTime: cloud.database().serverDate(), // 更新时间
      openid: wxContext.OPENID         // 用户openid
    };
    
    console.log('完整订单数据:', orderData);
    
    /** ========== 数据库操作 ========== */
    // 将订单数据存入数据库
    const result = await cloud.database().collection('orders').add({
      data: orderData
    });
    
    // 返回成功结果
    // 记录成功日志(脱敏处理)
    cloud.logger().log('订单创建成功', {
      orderId: result._id,
      phone: safePhone,
      location: `${location.latitude},${location.longitude}`
    });

    // 发送订单创建成功通知
    try {
      const notificationResult = await cloud.callFunction({
        name: 'sendOrderNotification',
        data: {
          type: 'ORDER_CREATED',
          orderId: result._id,
          data: {
            serviceName: '安平五金上门维修',
            address: address,
            createTime: Date.now(),
            remark: problem || '无描述'
          }
        }
      });

      if (notificationResult.result.code !== 0) {
        console.error('发送订单创建通知失败:', notificationResult.result.message);
        cloud.logger().warn('订单创建通知发送失败', {
          orderId: result._id,
          error: notificationResult.result.message
        });
      } else {
        cloud.logger().log('订单创建通知发送成功', {
          orderId: result._id,
          notificationId: notificationResult.result.data
        });
      }
    } catch (notifyError) {
      console.error('发送订单创建通知异常:', notifyError);
      cloud.logger().error('订单创建通知异常', {
        orderId: result._id,
        error: notifyError.message,
        stack: notifyError.stack
      });
    }

    return {
      code: ErrorCode.SUCCESS,
      data: { 
        orderId: result._id,
        createdAt: new Date().toISOString()
      },
      message: '订单提交成功'
    };
  } catch (err) {
    // 错误处理
    console.error('订单提交失败:', err);
    cloud.logger().error({
      message: '订单创建失败',
      data: {
        error: err.message,
        stack: err.stack
      }
    });
    
    return {
      code: ErrorCode.DB_ERROR,
      message: '系统繁忙，请稍后再试'
    };
  }
};