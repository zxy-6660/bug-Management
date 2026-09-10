import { useCallback, useEffect, useState } from 'react'
import BugForm from './components/BugForm'
import BugList from './components/BugList'
import { deleteBug, fetchBugs, reorderBugs, updateBug } from './lib/api'
import type { Bug, BugPatch } from './types'

export default function App() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBugs(await fetchBugs())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = useCallback(
    async (bug: Bug) => {
      setDeletingId(bug.id)
      setError(null)
      try {
        await deleteBug(bug)
        setBugs((prev) => prev.filter((b) => b.id !== bug.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败')
      } finally {
        setDeletingId(null)
      }
    },
    []
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
      // 按新顺序重写 sort_order 的本地副本
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
      // 标记已解决：sort_order 设为已解决组内最小值减 1，确保置顶到最前
      const nextSort = nextResolved
        ? Math.min(...bugs.filter((b) => b.resolved).map((b) => b.sort_order), 0) - 1
        : bug.sort_order

      const patch: BugPatch = { resolved: nextResolved, sort_order: nextSort }
      void updateBug(bug.id, patch)
        .then(() => {
          setBugs((prev) =>
            prev.map((b) => (b.id === bug.id ? { ...b, ...patch } : b))
          )
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '操作失败')
          void load() // 回滚到服务器一致状态
        })
    },
    [bugs, load]
  )

  return (
    <div className="page">
      <header className="page-header">
        <h1>问题反馈工作台</h1>
      </header>

      <main className="layout">
        <BugForm onCreated={load} />
        <BugList
          bugs={bugs}
          loading={loading}
          error={error}
          deletingId={deletingId}
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
