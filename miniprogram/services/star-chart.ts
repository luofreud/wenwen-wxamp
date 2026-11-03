import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'

type RelativeApiPath = `/${string}`

interface StarChartRequestParams {
  path: RelativeApiPath
  [key: string]: unknown
}

/**
 * 调用 APP 共用的星盘上游服务。
 * access token 和签名由服务端注入，调用方只提交业务参数。
 */
const requestXingpan = <T = unknown>(
  params: StarChartRequestParams,
): Promise<ApiResponse<T>> => {
  return http<T>({
    url: '/xingpan',
    method: 'POST',
    params: { ...params },
  })
}

/**
 * 调用使用独立 xingpango 配置的星盘上游服务。
 */
const requestXingpango = <T = unknown>(
  params: StarChartRequestParams,
): Promise<ApiResponse<T>> => {
  return http<T>({
    url: '/xingpango',
    method: 'POST',
    params: { ...params },
  })
}

export { requestXingpan, requestXingpango }
export type { RelativeApiPath, StarChartRequestParams }
