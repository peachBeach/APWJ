# 微信消息推送配置指南

## 一、必填字段说明

| 配置项 | 示例值 | 获取方式 | 注意事项 |
|--------|--------|----------|----------|
| URL | `https://thinkphp-nginx-fxs0-162444-4-1352151721.sh.run.tcloudbase.com/wechat` | 云托管服务公网地址 | ⚠️ 仅限测试使用，生产环境需使用正式域名 |
| Token | 从环境变量`WX_TOKEN`获取 | 服务端运行时注入 | 区分大小写 |
| EncodingAESKey | 从密钥管理服务获取 | 通过KMS解密使用 | 完整43位字符 |
| AppSecret | 从密钥管理服务获取 | 通过RBAC控制访问 | 定期轮换 |

## 二、配置界面截图指引

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发 > 开发设置 > 消息推送」

![配置位置](https://res.wx.qq.com/op_res/9rSix6dh0ZrDYm7Q5X3gsve7ZxZbZ5jH7X7j6z5Y0Q9jZ5jH7X7j6z5Y0Q9)

## 三、常见错误排查

1. **URL不可达**：
   - 测试命令：`curl -I "你的URL"`
   - 要求返回200状态码

2. **Token不匹配**：
   - 检查服务端`config.js`配置
   - 验证签名算法：
     ```js
     const crypto = require('crypto');
     const signature = crypto.createHash('sha1')
       .update([token, timestamp, nonce].sort().join(''))
       .digest('hex');
     ```

3. **EncodingAESKey错误**：
   - 必须为43位字符
   - 与服务端配置严格一致

## 四、云托管URL获取指南

### 测试环境URL获取：
1. 登录[云托管控制台](https://console.cloud.tencent.com/tcb/env/service)
2. 进入目标服务详情页
3. 在「访问管理」章节查看「公网访问地址」
4. 复制`https://[服务名].sh.run.tcloudbase.com`格式的地址

![测试环境URL位置](https://qcloudimg.tencent-cloud.cn/raw/xxx.png)

### 生产环境URL配置：
1. 备案自定义域名（如`wechat.yourdomain.com`）
2. 在云托管控制台「访问管理」添加域名映射
3. 配置HTTPS证书（推荐使用腾讯云SSL证书）
4. 等待DNS解析生效（约5-10分钟）

**生产环境**：
1. 购买自定义域名（需备案）
2. 在云托管控制台配置域名映射
3. 配置HTTPS证书
4. 微信公众平台填写正式域名

## 五、密钥安全管理规范

1. **存储要求**：
   - 禁止明文存储在任何代码/文档中
   - 使用腾讯云KMS或密钥管理系统
   - 开发环境与生产环境隔离

2. **访问控制**：
   ```bash
   # 通过CLI获取密钥（需权限）
   cloudbase kms:decrypt --keyId your-key-id --ciphertext blob
   ```

3. **审计要求**：
   - 记录所有密钥访问日志
   - 开启操作审计

## 六、配置验证流程

1. 点击「提交」按钮
2. 微信服务器将发送验证请求
3. 检查服务端日志：
   ```log
   [WeChat] 验证请求 received: {
     signature: "5a7baa2072f3b5c6b7c7b5e5c5c5c5c5c5c5c5c",
     timestamp: "1624444444",
     nonce: "123456"
   }
   ```
4. 预期返回：原始echostr字符串
