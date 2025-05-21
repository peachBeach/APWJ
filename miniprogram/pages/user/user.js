
/**
 * 用户订单页面
 * 仅显示订单信息，不包含用户登录功能
 */
Page({
  data: {
    orderStatus: [
      { type: -1, count: 0, name: '全部订单', selected: true },
      { type: 0, count: 0, name: '待接单', selected: false }, 
      { type: 1, count: 0, name: '进行中', selected: false },
      { type: 2, count: 0, name: '已完成', selected: false },
      { type: 3, count: 0, name: '已取消', selected: false }
    ],
    orders: [],
    filteredOrders: [], // 过滤后的订单列表
    currentFilter: -1, // -1表示全部订单
    isAdmin: false, // 管理员标识
    today: new Date().toISOString().split('T')[0] // 今天日期
  },

  // 管理员openid
  adminOpenid: 'o2mAF7MQ0GsEBZZNxhCALkz95QQI',

  // 状态文本过滤器
  statusText: {
    '0': '待接单',
    '1': '进行中', 
    '2': '已完成',
    '3': '已取消'
  },

  onLoad() {
    // 检查是否是管理员
    const app = getApp();
    this.setData({
      isAdmin: app.globalData.openid === this.adminOpenid
    });
    
    this.loadOrderCounts();
    this.loadOrders(-1); // 默认加载全部订单
  },

  onShow() {
    // 页面显示时重新加载确保数据最新
    this.loadOrderCounts();
    const status = this.data.currentFilter === -1 ? undefined : this.data.currentFilter;
    this.loadOrders(status);
  },

  // 下拉刷新
  onPullDownRefresh() {
    wx.showNavigationBarLoading(); // 显示导航栏loading
    // 确保传递当前筛选状态
    const status = this.data.currentFilter === -1 ? undefined : this.data.currentFilter;
    this.loadOrders(status, () => {
      wx.hideNavigationBarLoading(); // 隐藏导航栏loading
      wx.stopPullDownRefresh(); // 停止下拉刷新
    });
  },

  // 简化订单标记（移除红点逻辑）
  markNewOrders() {
    const orders = this.data.orders.map(order => ({
      ...order,
      isNew: false // 统一不显示红点
    }));
    this.setData({ orders });
  },

  // 跳转到订单详情（加锁版）
  navigateToOrderDetail(e) {
    const { id, status } = e.currentTarget.dataset;
    const app = getApp();
    
    // 操作锁防止重复点击
    if (this._clickLock) return;
    this._clickLock = true;
    
    // 立即更新本地状态
    const orders = this.data.orders.map(order => {
      if (order._id === id) {
        return { ...order, isNew: false };
      }
      return order;
    });
    this.setData({ orders });
    
    // 更新全局已读订单列表（原子操作）
    wx.getStorage({
      key: 'readOrders',
      success: (res) => {
        const readOrders = res.data || [];
        if (!readOrders.includes(id)) {
          readOrders.push(id);
          wx.setStorage({
            key: 'readOrders',
            data: readOrders,
            complete: () => {
              app.globalData.readOrders = [...readOrders];
              
              // 调用云函数更新已读状态
              wx.cloud.callFunction({
                name: 'updateOrderReadStatus',
                data: { orderId: id },
                complete: () => {
                  // 仅刷新订单列表
                  this.setData({ orders });
                  // 重新加载计数
                  this.loadOrderCounts();
                  this._clickLock = false;
                }
              });
            }
          });
        } else {
          this._clickLock = false;
        }
      },
      fail: () => {
        this._clickLock = false;
      }
    });

    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?id=${id}`
    });
  },

  // 加载订单列表
  loadOrders(status = -1, callback) {
    // 确保status有默认值
    const filterStatus = status === -1 ? undefined : status;
    wx.cloud.callFunction({
      name: 'getOrders',
      data: { 
        status: filterStatus,
        isAdmin: this.data.isAdmin // 管理员获取所有订单
      },
      success: (res) => {
        const app = getApp();
        // 初始化全局已读订单列表
        if (!app.globalData.readOrders) {
          app.globalData.readOrders = [];
        }
        // 按状态和日期排序：已取消(3)排最后，其他按创建时间升序
        const orders = res.result.data
          .sort((a, b) => {
            if (a.status === 3 && b.status !== 3) return 1;
            if (a.status !== 3 && b.status === 3) return -1;
            return new Date(a.createTime) - new Date(b.createTime);
          })
          .map(order => ({
            ...order,
            createTime: app.formatTime(app.parseTime(order.createTime)),
            statusClass: `status-${order.status}` // 添加状态类
          }));
        this.setData({
          orders,
          filteredOrders: orders, // 初始化过滤后的订单
          currentFilter: status === undefined ? -1 : status, // 确保有默认值
          selectedDate: null // 重置日期筛选
        });
        // 标记新订单
        this.markNewOrders();
        // 更新选中状态
        this.updateTabSelection(status);
        callback && callback();
      },
      fail: () => {
        callback && callback();
      }
    });
  },

  // 更新标签选中状态
  updateTabSelection(selectedType) {
    const newOrderStatus = this.data.orderStatus.map(item => ({
      ...item,
      selected: item.type === selectedType
    }));
    this.setData({ orderStatus: newOrderStatus });
  },

  // 切换订单类型
  switchOrderType(e) {
    const type = e.currentTarget.dataset.type;
    const status = type === -1 ? undefined : type;
    this.loadOrders(status);
  },

  // 加载订单统计数据
  loadOrderCounts() {
    wx.cloud.callFunction({
      name: 'getOrderCounts',
      success: (res) => {
        const counts = res.result || {};
        this.setData({
          'orderStatus[1].count': counts.pending || 0, // 待接单
          'orderStatus[2].count': counts.processing || 0, // 进行中
          'orderStatus[3].count': counts.completed || 0, // 已完成
          'orderStatus[4].count': counts.canceled || 0 // 已取消
        });
      },
      fail: () => {
        this.setData({
          'orderStatus[0].count': 0,
          'orderStatus[1].count': 0,
          'orderStatus[2].count': 0,
          'orderStatus[3].count': 0
        });
      }
    });
  },

  // 日期变化处理
  handleStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    });
  },

  handleEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    });
  },

  // 确认日期筛选
  confirmDateFilter() {
    const { currentFilter, startDate, endDate } = this.data;
    let status = currentFilter === -1 ? undefined : currentFilter;
    
    // 验证日期范围
    if (!startDate || !endDate) {
      wx.showToast({
        title: '请选择日期范围',
        icon: 'none'
      });
      return;
    }
    
    // 确保结束日期不小于开始日期
    if (new Date(startDate) > new Date(endDate)) {
      wx.showToast({
        title: '结束日期不能早于开始日期',
        icon: 'none'
      });
      return;
    }
    
    wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        status,
        startDate: `${startDate}T00:00:00.000Z`, // 格式化为ISO字符串
        endDate: `${endDate}T23:59:59.999Z`, // 格式化为ISO字符串
        isAdmin: this.data.isAdmin
      }
    }).then(res => {
      // 调试日志已移除
      this.processOrders(res.result);
    }).catch(err => {
      if (err) {
        console.error('日期查询失败:', err);
      }
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    });
  },

  // 处理订单数据
  processOrders(result) {
    const app = getApp();
    const orders = result.data
      .sort((a, b) => {
        if (a.status === 3 && b.status !== 3) return 1;
        if (a.status !== 3 && b.status === 3) return -1;
        return new Date(a.createTime) - new Date(b.createTime);
      })
      .map(order => ({
        ...order,
        createTime: app.formatTime(app.parseTime(order.createTime)),
        statusClass: `status-${order.status}`
      }));
    
    this.setData({ 
      orders,
      filteredOrders: orders
    });
  },

  // 查看全部订单
  viewAllOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  }
});
