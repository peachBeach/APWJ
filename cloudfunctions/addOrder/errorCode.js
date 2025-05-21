/**
 * 错误码常量定义
 * 规则：
 * 1xxx - 参数相关错误
 * 2xxx - 权限相关错误 
 * 3xxx - 数据校验错误
 * 4xxx - 业务逻辑错误
 * 5xxx - 数据库错误
 * 6xxx - 第三方服务错误
 * 0 - 成功
 */

module.exports = {
  // 成功
  SUCCESS: 0,
  
  // 参数错误
  INVALID_PARAMS: 1001,
  MISSING_PARAMS: 1002,
  
  // 位置相关
  INVALID_LOCATION: 3001,
  
  // 媒体文件
  INVALID_MEDIA: 3002,
  MEDIA_SIZE_EXCEED: 3003,
  
  // 数据库错误
  DB_ERROR: 5001,
  DB_TIMEOUT: 5002,
  
  // 系统错误
  SYSTEM_ERROR: 9999
};
