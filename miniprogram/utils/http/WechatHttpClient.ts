type RequestOptions = WechatMiniprogram.RequestOption
type RequestResponse = WechatMiniprogram.RequestSuccessCallbackResult
type RequestInterceptor = (
  options: RequestOptions,
) => RequestOptions | Promise<RequestOptions>
type ResponseInterceptor = (response: unknown) => unknown | Promise<unknown>

interface WechatRequestConfig {
  baseUrl: string
  getTokenUrl: string
  maxRefreshAttempts?: number
}

interface TokenResponse {
  code?: string | number
  data?: {
    token?: unknown
  }
}

interface BusinessResponse {
  code?: string | number
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isTokenResponse = (value: unknown): value is TokenResponse => {
  if (!isRecord(value)) {
    return false
  }

  return value.data === undefined || isRecord(value.data)
}

const isBusinessResponse = (value: unknown): value is BusinessResponse => {
  return isRecord(value)
}

/**
 * 微信小程序 HTTP 客户端，负责登录、token 注入及失效后的自动刷新。
 */
export default class WechatHttpClient {
  private static instance: WechatHttpClient | null = null

  private token: string | null = null
  private refreshPromise: Promise<void> | null = null
  private refreshAttemptCount = 0
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  private constructor(private readonly config: WechatRequestConfig) {}

  static getInstance(config?: WechatRequestConfig): WechatHttpClient {
    if (!WechatHttpClient.instance) {
      if (!config) {
        throw new Error('WechatHttpClient: first initialization requires config')
      }

      WechatHttpClient.instance = new WechatHttpClient(config)
    }

    return WechatHttpClient.instance
  }

  private getToken(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.config.baseUrl}${this.config.getTokenUrl}`,
        method: 'POST',
        data: { code },
        success: (response) => {
          const result = response.data

          if (
            isTokenResponse(result) &&
            String(result.code) === '10000' &&
            typeof result.data?.token === 'string'
          ) {
            resolve(result.data.token)
            return
          }

          reject(new Error('Failed to retrieve token'))
        },
        fail: reject,
      })
    })
  }

  private login(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: ({ code }) => {
          if (!code) {
            reject(new Error('wx.login did not return a code'))
            return
          }

          resolve(code)
        },
        fail: reject,
      })
    })
  }

  private refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const maxAttempts = this.config.maxRefreshAttempts ?? 2
    if (this.refreshAttemptCount >= maxAttempts) {
      return Promise.reject(new Error('Exceeded max token refresh attempts'))
    }

    this.refreshAttemptCount += 1
    this.refreshPromise = this.login()
      .then((code) => this.getToken(code))
      .then((token) => {
        this.token = token
        this.refreshAttemptCount = 0
      })
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  async request<T = unknown>(initialOptions: RequestOptions): Promise<T> {
    let options = initialOptions

    for (const interceptor of this.requestInterceptors) {
      options = await interceptor(options)
    }

    if (!this.token) {
      await this.refreshToken()
    }

    const doRequest = (hasRefreshed = false): Promise<T> => {
      return new Promise((resolve, reject) => {
        const header = { ...options.header }
        if (this.token) {
          header.token = this.token
        }

        wx.request({
          ...options,
          url: `${this.config.baseUrl}${options.url}`,
          header,
          success: (response: RequestResponse) => {
            if (
              isBusinessResponse(response.data) &&
              String(response.data.code) === '40001'
            ) {
              if (hasRefreshed) {
                reject(new Error('Token remains invalid after refresh'))
                return
              }

              this.token = null
              this.refreshToken()
                .then(() => doRequest(true))
                .then(resolve, reject)
              return
            }

            void this.applyResponseInterceptors(response).then(
              (result) => resolve(result as T),
              reject,
            )
          },
          fail: reject,
        })
      })
    }

    return doRequest()
  }

  private async applyResponseInterceptors(response: RequestResponse): Promise<unknown> {
    let result: unknown = response

    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result)
    }

    return result
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }
}
