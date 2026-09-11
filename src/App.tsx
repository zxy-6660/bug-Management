import { useCallback, useEffect, useState } from 'react'
import BugForm from './components/BugForm'
import BugList from './components/BugList'
import { createTab, deleteBug, deleteTab, fetchBugs, fetchTabCounts, fetchTabs, reorderBugs, updateBug, updateTab } from './lib/api'
import type { Bug, BugPatch, Tab } from './types'

export const MAX_TABS = 5

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({})
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 启动：加载标签页及计数，并选中第一个
  useEffect(() => {
    Promise.all([fetchTabs(), fetchTabCounts()])
      .then(([list, counts]) => {
        setTabs(list)
        setTabCounts(counts)
        if (list.length > 0) setActiveTabId(list[0].id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载标签页失败'))
  }, [])

  // 切换标签页时，加载对应页的问题
  const load = useCallback(async () => {
    if (!activeTabId) return
    setLoading(true)
    setError(null)
    try {
      setBugs(await fetchBugs(activeTabId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [activeTabId])

  useEffect(() => {
    void load()
  }, [load])

  /** 重算各标签页计数（提交/删除问题后调用） */
  const refreshTabCounts = useCallback(() => {
    fetchTabCounts()
      .then(setTabCounts)
      .catch(() => {}) // 计数失败不影响主流程
  }, [])

  const handleDelete = useCallback(
    async (bug: Bug) => {
      setDeletingId(bug.id)
      setError(null)
      try {
        await deleteBug(bug)
        setBugs((prev) => prev.filter((b) => b.id !== bug.id))
        refreshTabCounts()
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败')
      } finally {
        setDeletingId(null)
      }
    },
    [refreshTabCounts]
  )

  const handleUpdate = useCallback(async (bug: Bug, patch: BugPatch) => {
    setError(null)
    try {
      await updateBug(bug.id, patch)
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? { ...b, ...patch } : b)))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      return false
    }
  }, [])

  /** 拖拽结束后的新顺序：先本地更新 immediate，再持久化；失败则回滚 */
  const handleReorder = useCallback(
    (next: Bug[]) => {
      const prev = bugs
      const renumbered = next.map((b, i) => ({ ...b, sort_order: i + 1 }))
      setBugs(renumbered)
      void reorderBugs(renumbered.map((b) => ({ id: b.id, sort_order: b.sort_order }))).catch((err) => {
        setError(err instanceof Error ? err.message : '排序保存失败，已还原')
        setBugs(prev)
      })
    },
    [bugs]
  )

  /** 切换「已解决」：标为已解决时置顶到已解决组最前 */
  const handleToggleResolved = useCallback(
    (bug: Bug) => {
      const nextResolved = !bug.resolved
      const nextSort = nextResolved
        ? Math.min(...bugs.filter((b) => b.resolved).map((b) => b.sort_order), 0) - 1
        : bug.sort_order

      const patch: BugPatch = { resolved: nextResolved, sort_order: nextSort }
      void updateBug(bug.id, patch)
        .then(() => {
          setBugs((prev) => prev.map((b) => (b.id === bug.id ? { ...b, ...patch } : b)))
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '操作失败')
          void load() // 回滚到服务器一致状态
        })
    },
    [bugs, load]
  )

  /** 新增标签页（最多 5 个），默认命名「新标签页 N」 */
  const handleCreateTab = useCallback(async () => {
    if (tabs.length >= MAX_TABS) return
    setError(null)
    try {
      const name = `新标签页 ${tabs.length + 1}`
      const tab = await createTab(name)
      setTabs((prev) => [...prev, tab])
      setTabCounts((prev) => ({ ...prev, [tab.id]: 0 }))
      setActiveTabId(tab.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增标签页失败')
    }
  }, [tabs.length])

  /** 重命名标签页 */
  const handleRenameTab = useCallback(async (id: string, name: string) => {
    setError(null)
    try {
      await updateTab(id, name)
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '重命名失败')
      return false
    }
  }, [])

  /** 删除标签页：仅空页可删，删除后若当前页被删则切到相邻页 */
  const handleDeleteTab = useCallback(
    async (id: string) => {
      if ((tabCounts[id] ?? 1) > 0) {
        setError('只能删除没有问题的标签页')
        return
      }
      setError(null)
      try {
        await deleteTab(id)
        setTabs((prev) => {
          const next = prev.filter((t) => t.id !== id)
          if (activeTabId === id && next.length > 0) setActiveTabId(next[0].id)
          return next
        })
        setTabCounts((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除标签页失败')
      }
    },
    [tabCounts, activeTabId]
  )

  return (
    <div className="page">
      <header className="page-header">
        <h1>问题反馈工作台</h1>
      </header>

      <main className="layout">
        <BugForm onCreated={() => { void load(); refreshTabCounts() }} tabId={activeTabId} />
        <BugList
          tabs={tabs}
          tabCounts={tabCounts}
          activeTabId={activeTabId}
          maxTabs={MAX_TABS}
          bugs={bugs}
          loading={loading}
          error={error}
          deletingId={deletingId}
          onSelectTab={setActiveTabId}
          onCreateTab={handleCreateTab}
          onRenameTab={handleRenameTab}
          onDeleteTab={handleDeleteTab}
          onRetry={load}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onToggleResolved={handleToggleResolved}
          onReorder={handleReorder}
        />
      </main>
    </div>
  )
}