type RequestOptions = WechatMiniprogram.RequestOption
type RequestResponse = WechatMiniprogram.RequestSuccessCallbackResult
type RequestInterceptor = (
  options: RequestOptions,
) => RequestOptions | Promise<RequestOptions>
type ResponseInterceptor = (response: unknown) => unknown | Promise<unknown>

interface WechatRequestConfig {
  baseUrl: string
  loginUrl: string
  refreshUrl: string
  logoutUrl: string
}

interface ApiResponse {
  code?: string | number
  msg?: unknown
  data?: unknown
}

interface AuthData {
  access_token?: unknown
  refresh_token?: unknown
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toApiResponse = (value: unknown): ApiResponse | null => {
  return isRecord(value) ? value : null
}

const toAuthTokens = (value: unknown): AuthTokens | null => {
  const response = toApiResponse(value)
  if (!response || String(response.code) !== '200' || !isRecord(response.data)) {
    return null
  }

  const data: AuthData = response.data
  if (
    typeof data.access_token !== 'string' ||
    typeof data.refresh_token !== 'string'
  ) {
    return null
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
}

/**
 * 微信小程序 HTTP 客户端，负责登录、Bearer token 注入及 401 后的会话恢复。
 */
export default class WechatHttpClient {
  private static instance: WechatHttpClient | null = null

  private accessToken: string | null = null
  private refreshToken: string | null = null
  private authenticationPromise: Promise<void> | null = null
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

  private requestAuthTokens(
    url: string,
    data: Record<string, unknown>,
  ): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.config.baseUrl}${url}`,
        method: 'POST',
        data,
        success: (response) => {
          const tokens = toAuthTokens(response.data)
          if (tokens) {
            resolve(tokens)
            return
          }

          const result = toApiResponse(response.data)
          const message = typeof result?.msg === 'string'
            ? result.msg
            : 'Authentication failed'
          reject(new Error(message))
        },
        fail: reject,
      })
    })
  }

  private getLoginCode(): Promise<string> {
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

  private saveTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
  }

  private clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null
  }

  private login(): Promise<void> {
    return this.getLoginCode()
      .then((code) => this.requestAuthTokens(this.config.loginUrl, { code }))
      .then((tokens) => this.saveTokens(tokens))
  }

  private refresh(): Promise<void> {
    const currentRefreshToken = this.refreshToken
    if (!currentRefreshToken) {
      return Promise.reject(new Error('No refresh token available'))
    }

    return this.requestAuthTokens(this.config.refreshUrl, {
      refresh_token: currentRefreshToken,
    }).then((tokens) => this.saveTokens(tokens))
  }

  private runAuthentication(action: () => Promise<void>): Promise<void> {
    if (this.authenticationPromise) {
      return this.authenticationPromise
    }

    this.authenticationPromise = action().finally(() => {
      this.authenticationPromise = null
    })

    return this.authenticationPromise
  }

  private ensureAuthenticated(): Promise<void> {
    if (this.accessToken) {
      return Promise.resolve()
    }

    return this.runAuthentication(() => this.login())
  }

  private recoverAuthentication(): Promise<void> {
    return this.runAuthentication(async () => {
      try {
        await this.refresh()
      } catch {
        this.clearTokens()
        await this.login()
      }
    })
  }

  private isUnauthorized(response: RequestResponse): boolean {
    const result = toApiResponse(response.data)
    return response.statusCode === 401 || String(result?.code) === '401'
  }

  async request<T = unknown>(initialOptions: RequestOptions): Promise<T> {
    let options = initialOptions

    for (const interceptor of this.requestInterceptors) {
      options = await interceptor(options)
    }

    await this.ensureAuthenticated()

    const doRequest = (hasRecovered = false): Promise<T> => {
      return new Promise((resolve, reject) => {
        const requestAccessToken = this.accessToken
        const header = { ...options.header }
        if (requestAccessToken) {
          header.Authorization = `Bearer ${requestAccessToken}`
        }

        wx.request({
          ...options,
          url: `${this.config.baseUrl}${options.url}`,
          header,
          success: (response: RequestResponse) => {
            if (this.isUnauthorized(response)) {
              if (hasRecovered) {
                this.clearTokens()
                reject(new Error('Authentication failed after session recovery'))
                return
              }

              if (
                this.accessToken &&
                requestAccessToken !== this.accessToken
              ) {
                doRequest(true).then(resolve, reject)
                return
              }

              this.accessToken = null
              this.recoverAuthentication()
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

  async logout(): Promise<void> {
    if (!this.accessToken || !this.refreshToken) {
      this.clearTokens()
      return
    }

    const accessToken = this.accessToken
    const refreshToken = this.refreshToken

    try {
      await new Promise<void>((resolve, reject) => {
        wx.request({
          url: `${this.config.baseUrl}${this.config.logoutUrl}`,
          method: 'POST',
          header: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            refresh_token: refreshToken,
          },
          success: (response) => {
            const result = toApiResponse(response.data)
            if (String(result?.code) === '200') {
              resolve()
              return
            }

            reject(new Error(
              typeof result?.msg === 'string' ? result.msg : 'Logout failed',
            ))
          },
          fail: reject,
        })
      })
    } finally {
      this.clearTokens()
    }
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
