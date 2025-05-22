/**
 * 报修订单页面
 * 功能：
 * 1. 收集用户报修信息
 * 2. 处理位置选择和媒体上传
 * 3. 表单验证和提交
 */
Page({
  /**
   * 页面初始数据
   * 包含表单数据、位置信息和媒体文件列表
   */
  data: {
    // 动画控制
    animationRunning: false, // 动画运行状态
    animationDuration: 0,    // 动画持续时间
    
    // 动画控制
    animationRunning: false, // 动画运行状态
    animationDuration: 0,    // 动画持续时间
    marqueeAnimation: null,  // 动画对象
    
    // 表单数据
    contactPhone: '',       // 联系电话（手动输入）
    problemDescription: '', // 问题描述
    
    // 位置数据
    locationName: '',       // 位置名称
    displayAddress: '',     // 显示用地址
    inputAddress: '',       // 用户输入详细地址
    latitude: 33.2946,     // 默认位置-洪泽区纬度
    longitude: 118.8755,    // 默认位置-洪泽区经度
    markers: [{             // 地图标记点
      id: 0,
      latitude: 33.2946,
      longitude: 118.8755,
      iconPath: '/images/Location.png',
      width: 30,
      height: 30
    }],
    
    // 媒体数据
    mediaList: [],          // 上传的媒体文件列表
    maxMediaCount: 3        // 最大上传数量
  },

  onLoad() {
    // 初始化核心功能
    this.initCoreComponents();
  },

  onReady() {
    // 确保基础资源加载完成
    this.initCoreComponents();
  },

  initCoreComponents() {
    // 初始化核心组件
    this.initMapLocation();
  },

  // 初始化地图位置
  initMapLocation() {
    if (this.data.latitude && this.data.longitude) {
      // 已有位置数据，无需重新初始化
      return;
    }
    // 设置默认位置
    this.setData({
      latitude: 33.2946,
      longitude: 118.8755,
      markers: [{
        id: 0,
        latitude: 33.2946,
        longitude: 118.8755,
        iconPath: '/images/Location.png',
        width: 30,
        height: 30
      }]
    });
  },


  // 拨打紧急电话
  makePhoneCall(e) {
    const { phone } = e.currentTarget.dataset;
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  // 显示媒体选择菜单
  showMediaActionSheet() {
    wx.showActionSheet({
      itemList: ['拍摄', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseMedia('camera');
        } else {
          this.chooseMedia('album');
        }
      }
    });
  },

  // 选择媒体文件
  chooseMedia(sourceType) {
    if (this.data.mediaList.length >= this.data.maxMediaCount) {
      wx.showToast({ 
        title: `最多上传${this.data.maxMediaCount}个文件，请先删除再添加`,
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.chooseMedia({
      count: this.data.maxMediaCount - this.data.mediaList.length,
      mediaType: ['image', 'video'],
      sourceType: [sourceType],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const newMedia = res.tempFiles.map(item => ({
          url: item.tempFilePath,
          type: item.fileType.includes('video') ? 'video' : 'image',
          thumb: item.thumbTempFilePath || item.tempFilePath
        }));
        this.setData({
          mediaList: [...this.data.mediaList, ...newMedia]
        });
      }
    });
  },

  // 删除媒体文件
  removeMedia(e) {
    const { index } = e.currentTarget.dataset;
    const mediaList = [...this.data.mediaList];
    mediaList.splice(index, 1);
    this.setData({ mediaList });
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          locationName: res.name,
          displayAddress: res.address, // 仅显示不自动填充
          latitude: res.latitude,
          longitude: res.longitude,
          markers: [{
            id: 0,
            latitude: res.latitude,
            longitude: res.longitude,
            iconPath: '/images/Location.png',
            width: 30,
            height: 30
          }]
        });
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' });
      }
    });
  },

  // 点击输入框提示输入手机号
  showPhoneAuth() {
    if (!this.data.contactPhone) {
      wx.showToast({
        title: '如需电话回访请填写手机号',
        icon: 'none'
      });
    }
  },

  // 优化输入处理 - 防抖
  handleInputChange: (function() {
    let timer = null;
    return function(e) {
      const { field } = e.currentTarget.dataset;
      const value = e.detail.value;
      
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.setData({
          [field]: value
        });
      }, 300);
    };
  })(),

  // 检查必填项
  checkRequiredFields() {
    const requiredFields = [
      { field: 'contactPhone', name: '手机号' },
      { field: 'locationName', name: '服务地址' },
      { field: 'inputAddress', name: '详细地址' }
    ];
    
    return requiredFields.filter(item => !this.data[item.field]).map(item => item.name);
  },

  // 显示确认弹窗
  showSubmitConfirm(missingFields) {
    return new Promise((resolve) => {
      if (missingFields.length > 0) {
        wx.showModal({
          title: '温馨提示',
          content: `为了更好为您服务，请补充以下信息：\n${missingFields.join('、')}`,
          confirmText: '去补充',
          showCancel: false,
          success: () => {
            resolve(false);
          }
        });
      } else {
        wx.showModal({
          title: '确认提交',
          content: '确认提交报修信息？',
          confirmText: '确认提交',
          cancelText: '再检查',
          success: (res) => {
            resolve(res.confirm);
          }
        });
      }
    });
  },

  // 请求订阅消息授权
  async requestSubscription() {
    try {
      // 每次最多请求3个模板ID，根据当前场景选择最相关的模板
      const tmplIds = [
        'd0HiMwqgQa3Qyi8M0Jb-8IoJklJhlf0j0opoOGfwjvk', // 订单创建成功通知
        'k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo', // 接单成功通知
        'q-et-4UMkENK1C1-dgFxkWlWZ3w4N9WMK779BQTdCKw'  // 订单完成通知
      ];
      
      const result = await wx.requestSubscribeMessage({
        tmplIds: tmplIds
      });
      
      console.log('订阅消息授权结果:', result);
      // 即使用户拒绝也继续提交表单，不影响主流程
      return true;
    } catch (error) {
      console.error('请求订阅消息授权失败:', error);
      // 授权失败也继续提交表单，不影响主流程
      return true;
    }
  },

  // 优化表单提交
  async submitForm() {
    // 调试日志已移除
    
    // 检查必填项
    const missingFields = this.checkRequiredFields();
    const shouldSubmit = await this.showSubmitConfirm(missingFields);
    
    if (!shouldSubmit) {
      // 调试日志已移除
      return;
    }

    // 请求订阅消息授权
    await this.requestSubscription();

    try {
      // 调试日志已移除
      wx.showLoading({ title: '提交中...', mask: true });
      
      // 使用默认位置数据（洪泽区）如果用户未选择位置
      const finalLatitude = this.data.latitude || 33.2946;
      const finalLongitude = this.data.longitude || 118.8755;
      const finalLocationName = this.data.locationName || '洪泽区默认位置';
      const finalDisplayAddress = this.data.displayAddress || '洪泽区';
      
      // 准备提交数据 - 确保所有字段都有有效值
      const formData = {
        phone: this.data.contactPhone || '未提供联系电话',
        locationName: finalLocationName || '未提供位置名称',
        displayAddress: finalDisplayAddress || '未提供详细地址',
        inputAddress: this.data.inputAddress || '未提供补充地址',
        problem: this.data.problemDescription || '未提供问题描述',
        location: {
          latitude: finalLatitude,
          longitude: finalLongitude,
          name: finalLocationName || '未提供位置名称',
          address: finalDisplayAddress || '未提供详细地址'
        },
        mediaList: await this.processMediaFiles(),
        status: 0, // 默认状态为待接单
        createTime: new Date().toISOString() // 添加创建时间
      };

      // 确保位置信息完整
      if (!this.data.locationName) {
        this.setData({
          locationName: finalLocationName,
          displayAddress: finalDisplayAddress,
          latitude: finalLatitude,
          longitude: finalLongitude
        });
      }

      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'addOrder',
        data: formData,
        config: {
          env: 'cloud1-8gjn6lhxe97aa6b5'
        }
      });

      // 验证云函数返回结果
      if (!res || !res.result) {
        if (res && res.result) {
          console.error('云函数返回异常:', res);
        }
        throw new Error('云服务异常，请稍后再试');
      }
      
      if (res.result.code !== 0) {
        throw new Error(res.result.message || '订单提交失败');
      }

      if (!res.result.data || !res.result.data._id) {
        console.error('返回数据缺少ID:', res.result);
        throw new Error('未能获取订单ID');
      }

      // 处理成功响应
      const orderId = res.result.data._id;
      await this.handleSuccessResponse(orderId);
      
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      wx.hideLoading();
    }
  },

  // 优化媒体文件处理 - 并行上传
  async processMediaFiles() {
    const uploadTasks = this.data.mediaList
      .filter(item => !item.url.startsWith('cloud://'))
      .map(item => {
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const cloudPath = `media/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        
        return wx.cloud.uploadFile({
          cloudPath,
          filePath: item.url
        }).then(uploadRes => ({
          url: uploadRes.fileID,
          type: item.type
        })).catch(() => {
          throw new Error(`文件 ${item.url} 上传失败`);
        });
      });

    // 合并已上传和待上传文件
    const existingFiles = this.data.mediaList
      .filter(item => item.url.startsWith('cloud://'))
      .map(item => ({ url: item.url, type: item.type }));

    try {
      const uploadedFiles = await Promise.all(uploadTasks);
      return [...existingFiles, ...uploadedFiles];
    } catch (error) {
      if (error) {
        console.error('文件上传错误:', error);
      }
      throw error;
    }
  },

  // 处理成功响应
  async handleSuccessResponse(orderId) {
    try {
      if (!orderId) {
        throw new Error('未能获取订单ID');
      }
      
      this.resetForm();
      
      // 发送订单创建成功通知
      this.sendOrderCreatedNotification(orderId);
      
      await wx.navigateTo({
        url: `/pages/orderDetail/orderDetail?id=${encodeURIComponent(orderId)}`
      });
      
      wx.showToast({ 
        title: '提交成功，我们将尽快处理', 
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('处理成功响应时出错:', error);
      wx.showToast({
        title: '处理订单时出错，请稍后再试',
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 发送订单创建成功通知
  async sendOrderCreatedNotification(orderId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'sendOrderNotification',
        data: {
          type: 'ORDER_CREATED',
          orderId: orderId,
          data: {
            serviceName: '安平五金上门维修',
            address: this.data.locationName + ' ' + this.data.inputAddress,
            createTime: new Date().getTime(),
            remark: this.data.problemDescription || '无描述'
          }
        }
      });
      
      console.log('发送订单创建成功通知结果:', result);
    } catch (error) {
      console.error('发送订单创建成功通知失败:', error);
      // 通知失败不影响主流程
    }
  },

  // 处理提交错误
  handleSubmitError(error) {
    console.error('提交出错:', error);
    let errorMessage = '提交失败，请重试';
    
    try {
      if (error && typeof error === 'object') {
        // 调试日志已移除
        if (error.errMsg && error.errMsg.includes('cloud')) {
          errorMessage = '云服务异常，请稍后再试';
        } else if (error.message && error.message.includes('文件上传')) {
          errorMessage = '文件上传失败';
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.errMsg) {
          errorMessage = error.errMsg;
        }
      }
    } catch (e) {
      if (e) {
        console.error('处理错误时发生异常:', e);
      }
    }
    
    console.log('最终错误提示:', errorMessage);
    wx.showToast({ 
      title: errorMessage,
      icon: 'none',
      duration: 3000
    });
  },

  // 重置表单
  resetForm() {
    this.setData({
      contactPhone: '',
      problemDescription: '',
      locationName: '',
      detailAddress: '',
      latitude: null,
      longitude: null,
      mediaList: []
    });
  }
});