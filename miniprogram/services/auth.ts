import { logout as logoutRequest } from '../utils/http'

/**
 * 注销当前会话。登录和 token 刷新由 HTTP 客户端自动完成。
 */
const logout = (): Promise<void> => logoutRequest()

export { logout }
