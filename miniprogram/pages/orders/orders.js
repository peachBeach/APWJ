// pages/orders/orders.js
const DEFAULT_PAGE_SIZE = 10;

Page({
  data: {
    loading: false,
    hasMore: true,
    pageIndex: 0,
    orders: [],
    filterStatus: 'all', // all, pending, processing, completed
    tabs: [
      { key: 'all', title: '全部' },
      { key: 'pending', title: '待处理' },
      { key: 'processing', title: '进行中' },
      { key: 'completed', title: '已完成' }
    ],
    showSkeleton: true, // 骨架屏状态
    isEmpty: false       // 空数据状态
  },

  onLoad() {
    // 显示骨架屏
    this.setData({ showSkeleton: true });
    // 延迟加载避免白屏
    setTimeout(() => {
      this.loadOrders(true);
    }, 300);
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadOrders();
    }
  },

  onPullDownRefresh() {
    this.loadOrders(true);
  },

  // 切换状态筛选
  handleTabChange(e) {
    const { key } = e.currentTarget.dataset;
    if (this.data.filterStatus !== key) {
      this.setData({ 
        filterStatus: key,
        orders: [],
        pageIndex: 0,
        hasMore: true
      }, () => {
        this.loadOrders(true);
      });
    }
  },

  // 加载订单数据
  async loadOrders(reset = false) {
    if (this.data.loading) return;

    const pageIndex = reset ? 0 : this.data.pageIndex;
    const status = this.data.filterStatus === 'all' ? undefined : this.getStatusValue(this.data.filterStatus);

    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: {
          pageIndex,
          pageSize: DEFAULT_PAGE_SIZE,
          status
        }
      });

      if (res.result.code === 0) {
        const newOrders = res.result.data || [];
        const orders = reset ? newOrders : [...this.data.orders, ...newOrders];
        
        this.setData({
          orders,
          pageIndex: pageIndex + 1,
          hasMore: newOrders.length >= DEFAULT_PAGE_SIZE,
          showSkeleton: false,
          isEmpty: orders.length === 0 && reset
        });
      }
    } catch (error) {
      if (error) {
        console.error('加载订单失败:', error);
      }
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 获取状态值映射
  getStatusValue(filterKey) {
    const map = {
      pending: 0,
      processing: 1,
      completed: 2
    };
    return map[filterKey];
  },

  // 跳转订单详情
  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?id=${id}`
    });
  },

  // 缓存订单数据
  cacheOrders() {
    try {
      wx.setStorageSync('cachedOrders', {
        data: this.data.orders,
        timestamp: Date.now(),
        filterStatus: this.data.filterStatus
      });
    } catch (e) {
      if (e) {
        console.error('缓存订单数据失败:', e);
      }
    }
  },

  // 尝试从缓存加载
  tryLoadFromCache() {
    try {
      const cached = wx.getStorageSync('cachedOrders');
      if (cached && cached.filterStatus === this.data.filterStatus) {
        // 缓存有效期5分钟
        if (Date.now() - cached.timestamp < 300000) {
          this.setData({
            orders: cached.data,
            showSkeleton: false
          });
          return true;
        }
      }
    } catch (e) {
      if (e) {
        console.error('读取缓存失败:', e);
      }
    }
    return false;
  },

  onShareAppMessage() {
    return {
      title: '我的报修订单',
      path: '/pages/orders/orders'
    };
  },

  onHide() {
    this.cacheOrders();
  }
});
