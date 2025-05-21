# 该云函数已弃用

## 替代方案
Token服务已整合到`sendOrderNotification/wechatTokenService`中，新调用方式：
```javascript
// 推荐方式（直接获取token）
const token = await wechatTokenService.getAccessToken()

// 兼容方式（返回完整响应）
const { code, access_token } = await wechatTokenService.getToken()
```

## 删除计划
1. 确认所有调用方已迁移（检查日志）
2. 备份当前函数
3. 执行删除命令：
```powershell
Remove-Item -Recurse -Force cloudfunctions\getWechatToken
```

最后更新：2023-11-15
