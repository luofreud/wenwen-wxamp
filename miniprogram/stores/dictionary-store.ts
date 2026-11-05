import { getDictionaryItems } from '../services/dictionary'
import type { DictionaryItem } from '../services/dictionary'

class DictionaryStore {
  private readonly cache = new Map<string, DictionaryItem[]>()
  private readonly pendingRequests = new Map<string, Promise<DictionaryItem[]>>()

  getItems(
    dictTypeCode: string,
    forceRefresh = false,
  ): Promise<DictionaryItem[]> {
    const cachedItems = this.cache.get(dictTypeCode)
    if (!forceRefresh && cachedItems) {
      return Promise.resolve([...cachedItems])
    }

    const pendingRequest = this.pendingRequests.get(dictTypeCode)
    if (pendingRequest) {
      return pendingRequest.then((items) => [...items])
    }

    const request = getDictionaryItems(dictTypeCode)
      .then((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || '获取字典数据失败')
        }

        if (!Array.isArray(response.data)) {
          throw new Error('字典数据格式不正确')
        }

        const items = [...response.data]
        this.cache.set(dictTypeCode, items)
        return [...items]
      })
      .finally(() => {
        this.pendingRequests.delete(dictTypeCode)
      })

    this.pendingRequests.set(dictTypeCode, request)
    return request.then((items) => [...items])
  }

  clear(dictTypeCode?: string): void {
    if (dictTypeCode) {
      this.cache.delete(dictTypeCode)
      return
    }

    this.cache.clear()
  }
}

const dictionaryStore = new DictionaryStore()

export { dictionaryStore }
