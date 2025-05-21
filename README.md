# 云开发 quickstart

这是云开发的快速启动指引，其中演示了如何上手使用云开发的三大基础能力：

- 数据库：一个既可在小程序前端操作，也能在云函数中读写的 JSON 文档型数据库
- 文件存储：在小程序前端直接上传/下载云端文件，在云开发控制台可视化管理
- 云函数：在云端运行的代码，微信私有协议天然鉴权，开发者只需编写业务逻辑代码

## 消息推送配置

**重要安全提示**：以下Token为敏感信息，请勿泄露

| 配置项          | 值                                      |
|----------------|----------------------------------------|
| Token          | `TCB_BeBeSDe5gr2CHCeKDb8rg6mu2PxD`    |
| EncodingAESKey | `cNkyd7QyVVRPPEnunwt8pYbZh9JsArUoMXnzpth7i6v` |
| URL格式        | `https://[环境ID].service.tcloudbase.com/addOrder` |
| 示例URL       | `https://cloud1-8gjn6lhxe97aa6b5.service.tcloudbase.com/addOrder` (示例环境) |

**配置步骤**：
1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发 > 开发设置 > 消息推送」
3. 填写Token和云函数URL
4. 选择「安全模式」加密

## 云托管消息推送配置

**公网访问地址**：
`https://thinkphp-nginx-fxs0-162444-4-1352151721.sh.run.tcloudbase.com`

**配置要求**：
1. 在服务代码中实现：
   ```javascript
   // 校验微信服务器
   router.get('/wechat', (ctx) => {
     const { signature, timestamp, nonce, echostr } = ctx.query
     // 验证逻辑...
   });
   
   // 处理消息
   router.post('/wechat', (ctx) => {
     // 消息处理逻辑...
   });
   ```

2. 微信公众平台配置：
   - URL: `https://thinkphp-nginx-fxs0-162444-4-1352151721.sh.run.tcloudbase.com/wechat`
   - Token: `TCB_BeBeSDe5gr2CHCeKDb8rg6mu2PxD`
   - EncodingAESKey: `cNkyd7QyVVRPPEnunwt8pYbZh9JsArUoMXnzpth7i6v`

## 参考文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [消息推送配置指南](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html)
- [云托管配置指引](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/container/)
