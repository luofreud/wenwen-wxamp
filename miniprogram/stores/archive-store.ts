import { getArchives } from '../services/archives'
import type { Archive } from '../services/archives'

const SELECTED_ARCHIVE_ID_KEY = 'selected_archive_id'

interface ArchiveState {
  archives: Archive[]
  selectedArchiveId: number | null
  isLoading: boolean
}

type ArchiveStoreListener = (state: Readonly<ArchiveState>) => void

class ArchiveStore {
  private state: ArchiveState = {
    archives: [],
    selectedArchiveId: null,
    isLoading: false,
  }

  private initialized = false
  private refreshPromise: Promise<void> | null = null
  private readonly listeners = new Set<ArchiveStoreListener>()

  get selectedArchive(): Archive | null {
    return this.state.archives.find(({ id }) => {
      return id === this.state.selectedArchiveId
    }) ?? null
  }

  getSnapshot(): Readonly<ArchiveState> {
    return {
      archives: [...this.state.archives],
      selectedArchiveId: this.state.selectedArchiveId,
      isLoading: this.state.isLoading,
    }
  }

  subscribe(listener: ArchiveStoreListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  init(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve()
    }

    return this.refresh()
  }

  refresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.state.isLoading = true
    this.notify()

    this.refreshPromise = getArchives()
      .then((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || '档案加载失败')
        }

        this.state.archives = response.data
        this.state.selectedArchiveId = this.resolveSelectedArchiveId(response.data)
        this.initialized = true
        this.persistSelectedArchiveId()
      })
      .finally(() => {
        this.state.isLoading = false
        this.refreshPromise = null
        this.notify()
      })

    return this.refreshPromise
  }

  selectArchive(archiveId: number): boolean {
    if (!this.state.archives.some(({ id }) => id === archiveId)) {
      return false
    }

    if (this.state.selectedArchiveId === archiveId) {
      return true
    }

    this.state.selectedArchiveId = archiveId
    this.persistSelectedArchiveId()
    this.notify()
    return true
  }

  getArchiveById(archiveId: number): Archive | null {
    return this.state.archives.find(({ id }) => id === archiveId) ?? null
  }

  upsertArchive(archive: Archive): void {
    const archiveIndex = this.state.archives.findIndex(({ id }) => id === archive.id)
    if (archiveIndex === -1) {
      this.state.archives = [...this.state.archives, archive]
    } else {
      this.state.archives = this.state.archives.map((item) => {
        return item.id === archive.id ? archive : item
      })
    }

    if (this.state.selectedArchiveId === null) {
      this.state.selectedArchiveId = this.state.archives[0]?.id ?? null
      this.persistSelectedArchiveId()
    }
    this.notify()
  }

  removeArchive(archiveId: number): void {
    this.state.archives = this.state.archives.filter(({ id }) => id !== archiveId)

    if (this.state.selectedArchiveId === archiveId) {
      this.state.selectedArchiveId = this.state.archives[0]?.id ?? null
    }

    this.persistSelectedArchiveId()
    this.notify()
  }

  clear(): void {
    this.state = {
      archives: [],
      selectedArchiveId: null,
      isLoading: false,
    }
    this.initialized = false
    this.refreshPromise = null
    wx.removeStorageSync(SELECTED_ARCHIVE_ID_KEY)
    this.notify()
  }

  private resolveSelectedArchiveId(archives: Archive[]): number | null {
    const selectedArchiveId = this.state.selectedArchiveId ?? this.readSelectedArchiveId()
    if (
      selectedArchiveId !== null &&
      archives.some(({ id }) => id === selectedArchiveId)
    ) {
      return selectedArchiveId
    }

    return archives[0]?.id ?? null
  }

  private readSelectedArchiveId(): number | null {
    const storedValue: unknown = wx.getStorageSync(SELECTED_ARCHIVE_ID_KEY)
    const archiveId = Number(storedValue)
    return Number.isFinite(archiveId) && archiveId > 0 ? archiveId : null
  }

  private persistSelectedArchiveId(): void {
    if (this.state.selectedArchiveId === null) {
      wx.removeStorageSync(SELECTED_ARCHIVE_ID_KEY)
      return
    }

    wx.setStorageSync(SELECTED_ARCHIVE_ID_KEY, this.state.selectedArchiveId)
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

const archiveStore = new ArchiveStore()

export { archiveStore }
export type { ArchiveState, ArchiveStoreListener }
