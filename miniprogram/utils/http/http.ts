import WechatHttpClient from './WechatHttpClient'

interface ApiResponse {
  code?: string | number
  message?: unknown
}

interface HttpParams {
  url: string
  params: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const { appId } = wx.getAccountInfoSync().miniProgram

const client = WechatHttpClient.getInstance({
  baseUrl: 'http://localhost:5000',
  getTokenUrl: '/login',
  maxRefreshAttempts: 2,
})

client.addRequestInterceptor((options) => {
  const data = isRecord(options.data) ? options.data : {}

  return {
    ...options,
    data: {
      ...data,
      appId,
    },
  }
})

client.addResponseInterceptor((result) => {
  if (!isRecord(result) || !('data' in result)) {
    return result
  }

  const data: unknown = result.data
  const response: ApiResponse = isRecord(data) ? data : {}

  if (String(response.code) !== '200') {
    wx.showToast({
      title: typeof response.message === 'string' ? response.message : '请求失败',
      icon: 'none',
    })
  }

  return data
})

/**
 * 发送 POST 请求。
 *
 * @example
 * ```ts
 * const result = await http<UserInfo>({
 *   url: '/info',
 *   params: {
 *     testNo: '09001',
 *   },
 * })
 * ```
 */
const http = <T = unknown>({ url, params }: HttpParams): Promise<T> => {
  return client.request<T>({
    url,
    method: 'POST',
    header: {
      'content-type': 'application/json',
      appId,
    },
    data: params,
    dataType: 'json',
  })
}

export { http }
