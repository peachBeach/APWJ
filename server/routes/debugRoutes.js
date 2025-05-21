const express = require('express');
const router = express.Router();
const { getAccessToken } = require('../wechatTokenService');

// 调试接口（仅开发环境可用）
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/token', async (req, res) => {
    try {
      const token = await getAccessToken();
      // 安全掩码显示（保留前后各4位）
      const maskedToken = token.slice(0, 4) + '****' + token.slice(-4);
      
      res.json({
        code: 0,
        data: {
          token: maskedToken,
          hint: '此为调试信息，正式环境请关闭此接口'
        }
      });
    } catch (error) {
      res.status(500).json({
        code: -1,
        message: error.message
      });
    }
  });
}

module.exports = router;
