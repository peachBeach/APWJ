const crypto = require('crypto');

// 配置参数（需与微信公众平台一致）
const config = {
  token: 'TCB_BeBeSDe5gr2CHCeKDb8rg6mu2PxD',
  encodingAESKey: 'cNkyd7QyVVRPPEnunwt8pYbZh9JsArUoMXnzpth7i6v'
};

// 验证微信服务器（GET接口）
exports.verifyServer = (signature, timestamp, nonce, echostr) => {
  const arr = [config.token, timestamp, nonce].sort();
  const sha1 = crypto.createHash('sha1');
  sha1.update(arr.join(''));
  const calcSignature = sha1.digest('hex');
  
  if (calcSignature === signature) {
    return echostr; // 验证成功返回echostr
  }
  throw new Error('Invalid signature');
};

// 处理消息（POST接口）
exports.processMessage = (xmlData) => {
  // TODO: 实现消息解密和处理逻辑
  // 调试日志已移除
  return 'success';
};

// 错误处理中间件
exports.errorHandler = (err, req, res, next) => {
  if (err) {
    console.error('Error:', err);
  }
  res.status(500).send(err.message);
};
