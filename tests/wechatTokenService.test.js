const { getAccessToken } = require('../server/wechatTokenService');
const axios = require('axios');
const cache = require('memory-cache');

jest.mock('axios');
jest.mock('memory-cache');

describe('wechatTokenService', () => {
  beforeEach(() => {
    cache.clear();
  });

  test('should return cached token if available', async () => {
    cache.get.mockReturnValue('cached_token');
    const token = await getAccessToken();
    expect(token).toBe('cached_token');
  });

  test('should fetch new token when cache is empty', async () => {
    axios.get.mockResolvedValue({
      data: {
        access_token: 'new_token',
        expires_in: 7200
      }
    });
    const token = await getAccessToken();
    expect(token).toBe('new_token');
    expect(cache.put).toHaveBeenCalled();
  });

  test('should handle API errors', async () => {
    axios.get.mockRejectedValue(new Error('API error'));
    await expect(getAccessToken()).rejects.toThrow('微信服务不可用');
  });
});
