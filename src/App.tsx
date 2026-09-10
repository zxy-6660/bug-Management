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
          onReorder={handleReorder}
        />
      </main>
    </div>
  )
}
