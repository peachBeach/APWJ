/**
 * 小程序入口文件
 * 功能：
 * 1. 初始化云开发环境
 * 2. 获取基础设备信息
 * 3. 实现匿名登录机制
 */
// SharedArrayBuffer兼容性处理
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer is not supported in this environment');
}

// SharedArrayBuffer兼容性处理
if (typeof SharedArrayBuffer === 'undefined') {
  console.log('当前环境不支持SharedArrayBuffer，已忽略兼容性警告');
}

App({
  /**
   * 小程序初始化生命周期函数
   * 完成云开发初始化、设备信息获取和匿名登录
   */
  onLaunch() {
    // 初始化云开发环境
    try {
      wx.cloud.init({
        env: 'cloud1-8gjn6lhxe97aa6b5'
      });
      this.globalData.cloud = wx.cloud;

      // 增强版openid获取逻辑
      this.initUserInfo().then(() => {
        
        // 检查订阅状态并提示
        this.checkSubscriptionStatus().then(hasSubscribed => {
          if (!hasSubscribed) {
            wx.showModal({
              title: '订阅提示',
              content: '订阅服务通知可及时获取订单状态更新',
              confirmText: '立即订阅',
              cancelText: '暂不',
              success: (res) => {
                if (res.confirm) {
                  this.requestUserSubscription();
                }
              }
            });
          }
        });
      }).catch(err => {
        console.error('用户初始化失败:', err);
        this.showAuthModal();
      });
    } catch (err) {
      console.error('云开发初始化失败:', err);
    }

    // 获取设备信息（使用新API）
    wx.getDeviceInfo({
      success: (res) => {
        this.globalData.deviceInfo = res;
        console.log('设备信息:', res);
      },
      fail: (err) => {
        console.error('获取设备信息失败:', err);
      }
    });
  },

  globalData: {
    cloud: null,
    orderStatusMap: { 0: '未接单', 1: '已接单', 2: '已完成' },
    openid: null,
    isAdmin: false
  },

  // 初始化用户信息（包含openid和管理员状态）
  initUserInfo() {
    return new Promise((resolve, reject) => {
      // 1. 检查授权状态
      wx.getSetting({
        success: res => {
          if (!res.authSetting['scope.userInfo']) {
            return reject(new Error('用户未授权'));
          }
          
          // 2. 获取openid
          wx.cloud.callFunction({
            name: 'getUserOpenid',
            success: res => {
              if (!res.result || res.result.errcode !== 0) {
                return reject(new Error('获取openid失败'));
              }
              
              const openid = res.result.openid;
              const isAdmin = openid === 'o2mAF7MQ0GsEBZZNxhCALkz95QQI';
              
              // 3. 更新全局数据
              this.globalData.openid = openid;
              this.globalData.isAdmin = isAdmin;
              
              console.log('用户信息已更新', {
                openid,
                isAdmin,
                time: new Date().toISOString()
              });
              
              resolve();
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  },
  
  // 显示授权弹窗
  // 检查订阅状态（返回Promise）
  checkSubscriptionStatus() {
    return new Promise((resolve) => {
      // 先检查本地存储
      wx.getStorage({
        key: 'hasSubscribed',
        success: (res) => {
          if (res.data) {
            this.globalData.hasSubscribed = true;
            console.log('从本地存储读取到已订阅状态');
            resolve(true);
            return;
          }
          
          // 本地没有存储则检查微信订阅状态
          wx.getSetting({
            withSubscriptions: true,
            success: (res) => {
              if (res.subscriptionsSetting && 
                  res.subscriptionsSetting['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'] === 'accept') {
                this.globalData.hasSubscribed = true;
                wx.setStorage({
                  key: 'hasSubscribed',
                  data: true
                });
                console.log('用户已订阅服务通知');
                resolve(true);
              } else {
                this.globalData.hasSubscribed = false;
                console.log('用户未订阅服务通知');
                resolve(false);
              }
            },
            fail: (err) => {
              console.error('获取订阅设置失败:', err);
              resolve(false);
            }
          });
        },
        fail: () => {
          // 本地存储不存在则检查微信订阅状态
          wx.getSetting({
            withSubscriptions: true,
            success: (res) => {
              if (res.subscriptionsSetting && 
                  res.subscriptionsSetting['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'] === 'accept') {
                this.globalData.hasSubscribed = true;
                wx.setStorage({
                  key: 'hasSubscribed',
                  data: true
                });
                console.log('用户已订阅服务通知');
                resolve(true);
              } else {
                this.globalData.hasSubscribed = false;
                console.log('用户未订阅服务通知');
                resolve(false);
              }
            },
            fail: (err) => {
              console.error('获取订阅设置失败:', err);
              resolve(false);
            }
          });
        }
      });
    });
  },
  
  // 用户点击触发的订阅方法
  requestUserSubscription() {
    wx.requestSubscribeMessage({
      tmplIds: ['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'],
      success: (res) => {
        if (res['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'] === 'accept') {
          this.globalData.hasSubscribed = true;
          wx.setStorage({
            key: 'hasSubscribed',
            data: true
          });
          wx.showToast({ title: '订阅成功' });
        } else {
          this.globalData.hasSubscribed = false;
          this.showSubscribeGuide();
        }
      },
      fail: (err) => {
        console.error('订阅请求失败:', err);
        wx.showToast({ title: '订阅失败', icon: 'none' });
      }
    });
  },
  
  // 请求订阅消息
  requestSubscription() {
    wx.requestSubscribeMessage({
      tmplIds: ['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'],
      success: (res) => {
        if (res['k9hnHhUXfcsSj1CheJJhmsIWVJc31Z2XwzM80E5LfXo'] === 'accept') {
          console.log('订阅成功');
        } else {
          console.log('用户拒绝订阅');
          this.showSubscribeGuide();
        }
      },
      fail: (err) => {
        console.error('订阅请求失败:', err);
      }
    });
  },
  
  // 显示订阅引导
  showSubscribeGuide() {
    wx.showModal({
      title: '订阅提示',
      content: '订阅服务通知可及时获取服务状态更新，是否重新订阅？',
      confirmText: '去订阅',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          this.requestSubscription();
        }
      }
    });
  },
  
  showAuthModal() {
    wx.showModal({
      title: '提示',
      content: '需要您的授权才能继续使用',
      confirmText: '去授权',
      success: () => {
        wx.navigateTo({
          url: '/pages/auth/auth'
        });
      }
    });
  },

  formatTime(date) {
    if (!date) return '';
    
    // iOS兼容的日期解析
    if (typeof date === 'string') {
      // 处理带T的时间格式
      if (date.includes('T')) {
        date = new Date(date);
      } 
      // 处理空格分隔的日期时间
      else if (date.includes(' ')) {
        const [datePart, timePart] = date.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hour, minute);
      }
      // 其他格式尝试直接解析
      else {
        date = new Date(date);
      }
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day} ${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}`;
  },
  
  // 新增iOS兼容的日期解析方法
  parseTime(timeStr) {
    if (!timeStr) return new Date();
    
    // 处理带T的时间格式
    if (timeStr.includes('T')) {
      return new Date(timeStr);
    }
    // 处理空格分隔的日期时间
    else if (timeStr.includes(' ')) {
      const [datePart, timePart] = timeStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute);
    }
    // 其他格式尝试直接解析
    return new Date(timeStr);
  }
});