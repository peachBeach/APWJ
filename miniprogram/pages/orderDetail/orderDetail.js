7035
Page({
  data: {
    order: {},
    markers: [],
    isAdmin: false // 管理员标识
  },

  // 管理员openid
  adminOpenid: 'o2mAF7MQ0GsEBZZNxhCALkz95QQI',

  onLoad(options) {
    // 检查是否是管理员
    const app = getApp();
    const isAdmin = app.globalData.openid === this.adminOpenid;
    // 调试日志已移除
    this.setData({
      isAdmin: isAdmin
    });
    
    // 获取设备信息（替代弃用API）
    Promise.all([
      wx.getDeviceInfo ? wx.getDeviceInfo() : Promise.resolve({}),
      wx.getWindowInfo ? wx.getWindowInfo() : Promise.resolve({})
    ]).then(([deviceInfo, windowInfo]) => {
      this.setData({ deviceInfo, windowInfo });
      if (options.id) {
        this.getOrderDetail(options.id);
      }
    });
  },

  // 优化数据加载
  async getOrderDetail(id) {
    const startTime = Date.now();
    try {
      wx.showLoading({ title: '加载中...' });
      
      // 预加载必要资源
      await Promise.all([
        this.preloadMediaResources(),
        this.preloadMapComponents()
      ]);

      const res = await wx.cloud.callFunction({
        name: 'getOrder',
        data: { id }
      });

      // 统一数据校验
      if (!res?.result?.data || res.result.code !== 0) {
        throw new Error(res.result?.message || '订单数据异常');
      }

      const { order } = this.processOrderData(res.result.data);
      
      // 合并setData调用
      this.setData({
        order,
        markers: this.generateMarkers(order.location)
      });

    } catch (error) {
      this.handleDataError(error);
    } finally {
      wx.hideLoading();
    }
  },

  // 预处理订单数据
  processOrderData(rawData) {
    const order = { ...rawData };
    
    // 处理时间
    order.createTime = order.createTime ? 
      this.formatTime(order.createTime) : '无数据';
    order.statusText = this.getStatusText(order.status);
    
    // 处理媒体文件
    order.mediaList = (Array.isArray(order.mediaList) ? order.mediaList : [])
      .filter(item => this.isValidMediaUrl(item.url))
      .map(item => ({
        ...item,
        type: item.type || 'image'
      }));
    
    return { order };
  },

  // 生成地图标记
  generateMarkers(location) {
    // 参数校验
    if (!location || typeof location !== 'object') {
      console.warn('位置参数无效:', location);
      return [];
    }

    // 类型和范围校验
    const { latitude, longitude } = location;
    const isValidCoord = (val, min, max) => 
      typeof val === 'number' && !isNaN(val) && val >= min && val <= max;

    if (!isValidCoord(latitude, -90, 90) || !isValidCoord(longitude, -180, 180)) {
      console.warn('经纬度值不合法:', {latitude, longitude});
      return [];
    }

    return [{
      id: 0,
      latitude,
      longitude,
      iconPath: '/images/location.png',
      width: 30,
      height: 30
    }];
  },

  // 预加载媒体资源
  async preloadMediaResources() {
    // 预留扩展点
    return Promise.resolve();
  },

  // 预加载地图组件
  async preloadMapComponents() {
    // 预留扩展点
    return Promise.resolve();
  },

  // 统一错误处理
  handleDataError(error) {
    console.error('数据加载错误:', error);
    
    const errorMap = {
      '订单数据异常': '订单数据异常，请刷新重试',
      '服务异常': '服务暂时不可用，请稍后再试'
    };
    
    const message = errorMap[error.message] || '加载失败，请检查网络';
    
    wx.showModal({
      title: '提示',
      content: message,
      showCancel: false
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      0: '待接单',
      1: '进行中',
      2: '已完成',
      3: '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  formatTime(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  },

  // 预览媒体文件
  previewMedia(e) {
    const index = e.currentTarget.dataset.index;
    const mediaList = this.data.order.mediaList || [];
    const images = mediaList
      .filter(item => (item.type === 'image' || !item.type) && 
        (item.url.startsWith('cloud://') || item.url.startsWith('https://')))
      .map(item => item.url);
    
    if (images.length > 0) {
      wx.previewImage({
        current: images[index],
        urls: images
      });
    } else {
      wx.showToast({
        title: '无可预览的图片',
        icon: 'none'
      });
    }
  },

  // 检查消息订阅状态
  checkSubscribeStatus(type) {
    // 根据不同操作类型获取对应的模板ID
    const tmplIdsMap = {
      'accept': ['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'], // 接单通知
      'complete': ['q-et-4UMkENK1C1-dgFxkWlWZ3w4N9WMK779BQTdCKw'], // 完成通知
      'cancel': ['5uekBbznU7y8e39__dE9Zg0WQr4af5B1JKOuIZIqd40']   // 取消通知
    };
    
    const tmplIds = tmplIdsMap[type] || ['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'];
    
    return new Promise((resolve) => {
      wx.requestSubscribeMessage({
        tmplIds: tmplIds,
        success: (res) => {
          console.log('订阅消息授权结果:', res);
          // 即使用户拒绝也继续操作，不影响主流程
          resolve(true);
        },
        fail: (err) => {
          console.error('订阅消息失败:', err);
          wx.showToast({
            title: '请允许接收通知以获取订单状态更新',
            icon: 'none'
          });
          // 即使失败也继续操作，不影响主流程
          resolve(true);
        }
      });
    });
  },

  // 优化状态更新操作
  async updateOrderStatus(newStatus) {
    const statusActions = {
      1: { 
        title: '接单', 
        success: '接单成功',
        type: 'accept',
        notificationType: 'ORDER_ACCEPTED',
        notificationData: (order) => ({
          orderId: order._id,
          serviceName: '安平五金上门维修',
          technicianName: '维修师傅',
          appointmentTime: new Date().getTime(),
          contactPhone: order.phone || '暂无'
        })
      },
      2: { 
        title: '完成', 
        success: '订单已完成',
        type: 'complete',
        notificationType: 'ORDER_COMPLETED',
        notificationData: (order) => ({
          orderId: order._id,
          serviceName: '安平五金上门维修',
          completionTime: new Date().getTime(),
          serviceResult: '维修完成',
          remark: '感谢您的信任'
        })
      },
      3: { 
        title: '取消', 
        success: '订单已取消',
        type: 'cancel',
        notificationType: 'ORDER_CANCELLED',
        notificationData: (order) => ({
          orderId: order._id,
          cancelTime: new Date().getTime(),
          reason: '用户取消订单'
        })
      }
    };
    
    const action = statusActions[newStatus];
    if (!action) return;

    try {
      // 检查订阅状态
      await this.checkSubscribeStatus(action.type);
      
      const confirmRes = await wx.showModal({
        title: `确认${action.title}`,
        content: `确定要${action.title}此订单吗？`,
      });
      
      if (!confirmRes.confirm) return;

      wx.showLoading({ title: '处理中...' });
      
      // 更新状态
      const updateRes = await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: {
          orderId: this.data.order._id,
          status: newStatus
        }
      });

      if (updateRes.result.code !== 0) {
        throw new Error(updateRes.result.message || '操作失败');
      }

      // 更新本地数据
      const updatedOrder = {
        ...this.data.order,
        status: newStatus,
        statusText: this.getStatusText(newStatus)
      };
      
      // 发送状态变更通知
      await this.sendOrderNotification(
        action.notificationType, 
        action.notificationData(updatedOrder)
      );

      // 更新视图
      this.setData({ order: updatedOrder });
      this.notifyPreviousPage();
      
      wx.showToast({ title: action.success });

    } catch (error) {
      console.error(`${action.title}订单失败:`, error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 发送订单通知
  async sendOrderNotification(type, data) {
    try {
      await wx.cloud.callFunction({
        name: 'sendOrderNotification',
        data: {
          orderId: this.data.order._id,
          type,
          data
        }
      });
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  },

  // 通知上一页更新
  notifyPreviousPage() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      prevPage.loadOrderCounts?.();
      prevPage.loadOrders?.();
    }
  },

  // 接单操作
  acceptOrder() {
    this.updateOrderStatus(1);
  },

  // 完成订单
  completeOrder() {
    this.updateOrderStatus(2);
  },

  // 取消订单
  cancelOrder() {
    this.updateOrderStatus(3);
  },

  // 通知用户维修完成（不修改状态）
  async notifyComplete() {
    try {
      wx.showLoading({ title: '处理中...' });
      
      // 严格校验订单数据
      if (!this.data.order?._id || !this.data.order?.openid) {
        throw new Error('订单数据不完整，缺少必要字段');
      }

      // 调用云函数（带重试机制）
      let retryCount = 0;
      const maxRetries = 2;
      let lastError;

      while (retryCount <= maxRetries) {
        try {
          const result = await Promise.race([
            wx.cloud.callFunction({
              name: 'sendOrderNotification',
              data: {
                type: 'ORDER_COMPLETED',
                orderId: this.data.order._id,
                openid: this.data.order.openid,
                data: {
                  serviceName: '维修服务',
                  rating: '5',
                  comment: '维修已完成'
                }
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('请求超时')), 5000))
          ]);

          if (result?.result?.code === 0) {
            wx.showToast({
              title: '通知发送成功',
              icon: 'success',
              duration: 2000
            });
            return;
          }
          lastError = result?.result?.message || '发送失败';
        } catch (err) {
          lastError = err.message;
          if (retryCount === maxRetries) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retryCount++;
      }

      throw new Error(lastError || '通知发送失败');

    } catch (error) {
      console.error('通知发送失败:', error);
      wx.showToast({
        title: error.message.includes('timeout') ? 
          '网络超时，请重试' : error.message,
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
  }
});