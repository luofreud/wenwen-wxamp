import WechatHttpClient from './WechatHttpClient'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

type HttpMethod = WechatMiniprogram.RequestOption['method'] | 'PATCH'

interface HttpParams {
  url: string
  method?: HttpMethod
  params?: Record<string, unknown>
  header?: Record<string, string>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const client = WechatHttpClient.getInstance({
  baseUrl: 'https://internal.amoro.cn/api/wechat/v1',
  loginUrl: '/auth/login',
  refreshUrl: '/auth/refresh',
  logoutUrl: '/auth/logout',
})

client.addResponseInterceptor((result) => {
  if (!isRecord(result) || !('data' in result)) {
    return result
  }

  const data: unknown = result.data
  if (!isRecord(data)) {
    return data
  }

  if (String(data.code) !== '200') {
    wx.showToast({
      title: typeof data.msg === 'string' ? data.msg : '请求失败',
      icon: 'none',
    })
  }

  return data
})

/**
 * 发送微信小程序 API 请求，默认使用 GET。
 *
 * @example
 * ```ts
 * const result = await http<UserInfo[]>({
 *   url: '/archives',
 * })
 *
 * const created = await http<UserInfo>({
 *   url: '/archives',
 *   method: 'POST',
 *   params: formData,
 * })
 * ```
 */
const http = <T = unknown>({
  url,
  method = 'GET',
  params,
  header,
}: HttpParams): Promise<ApiResponse<T>> => {
  return client.request<ApiResponse<T>>({
    url,
    method: method as WechatMiniprogram.RequestOption['method'],
    header: {
      'content-type': 'application/json',
      ...header,
    },
    data: params,
    dataType: 'json',
  })
}

const logout = (): Promise<void> => client.logout()

export { http, logout }
export type { ApiResponse, HttpMethod, HttpParams }
