import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import BugCard from './BugCard'
import type { Bug, BugPatch, Tab } from '../types'

type Props = {
  tabs: Tab[]
  tabCounts: Record<string, number>
  activeTabId: string | null
  maxTabs: number
  bugs: Bug[]
  loading: boolean
  error: string | null
  deletingId: string | null
  onSelectTab: (id: string) => void
  onCreateTab: () => void
  onRenameTab: (id: string, name: string) => Promise<boolean>
  onDeleteTab: (id: string) => void
  onRetry: () => void
  onDelete: (bug: Bug) => void
  onUpdate: (bug: Bug, patch: BugPatch) => Promise<boolean>
  onToggleResolved: (bug: Bug) => void
  onReorder: (next: Bug[]) => void
}

export default function BugList({
  tabs,
  tabCounts,
  activeTabId,
  maxTabs,
  bugs,
  loading,
  error,
  deletingId,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
  onRetry,
  onDelete,
  onUpdate,
  onToggleResolved,
  onReorder
}: Props) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
      keyboardCoordinates: sortableKeyboardCoordinates
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = bugs.findIndex((b) => b.id === active.id)
    const to = bugs.findIndex((b) => b.id === over.id)
    if (from < 0 || to < 0) return

    onReorder(arrayMove(bugs, from, to))
  }

  function startRename(tab: Tab) {
    setEditingTabId(tab.id)
    setRenameDraft(tab.name)
  }

  function cancelRename() {
    setEditingTabId(null)
    setRenameDraft('')
  }

  async function commitRename() {
    if (!editingTabId) return
    const name = renameDraft.trim()
    if (!name) {
      cancelRename()
      return
    }
    if (name === tabs.find((t) => t.id === editingTabId)?.name) {
      cancelRename()
      return
    }
    setRenaming(true)
    const ok = await onRenameTab(editingTabId, name)
    setRenaming(false)
    if (ok) cancelRename()
  }

  return (
    <section className="list-section">
      <div className="list-header">
        <h2 className="card-title">问题列表</h2>
        <span className="count-badge">{loading ? '加载中' : `${bugs.length} 条`}</span>
      </div>

      {/* 标签页栏 */}
      <div className="tabs-bar" role="tablist">
        {tabs.map((tab) =>
          editingTabId === tab.id ? (
            <span key={tab.id} className="tab-rename">
              <input
                autoFocus
                className="tab-rename-input"
                value={renameDraft}
                maxLength={20}
                disabled={renaming}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={() => void commitRename()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename()
                  if (e.key === 'Escape') cancelRename()
                }}
              />
            </span>
          ) : (
            <span key={tab.id} className="tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={tab.id === activeTabId}
                title={
                  (tabCounts[tab.id] ?? 0) > 0
                    ? `含 ${tabCounts[tab.id]} 条，清空后才能删除；双击可重命名`
                    : '双击可重命名'
                }
                className={`tab-btn${tab.id === activeTabId ? ' active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
                onDoubleClick={() => startRename(tab)}
              >
                <span className="tab-name">{tab.name}</span>
              </button>
              {(tabCounts[tab.id] ?? 0) === 0 && (
                <button
                  type="button"
                  className="tab-del"
                  title="删除标签页（空页可删）"
                  aria-label={`删除标签页 ${tab.name}`}
                  onClick={() => onDeleteTab(tab.id)}
                >
                  ×
                </button>
              )}
            </span>
          )
        )}
        {tabs.length < maxTabs && (
          <button type="button" className="tab-btn add" title="新增标签页" onClick={onCreateTab}>
            + 新增
          </button>
        )}
      </div>

      {loading && <div className="card placeholder">正在加载问题列表…</div>}

      {!loading && error && (
        <div className="card placeholder">
          <p className="alert alert-error">{error}</p>
          <button type="button" className="ghost-btn" onClick={onRetry}>
            重新加载
          </button>
        </div>
      )}

      {!loading && !error && bugs.length === 0 && (
        <div className="card placeholder">暂时还没有问题反馈，使用左侧表单提交第一条吧。</div>
      )}

      {!loading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={bugs.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="sortable-list">
              {bugs.map((bug) => (
                <BugCard
                  key={bug.id}
                  bug={bug}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onToggleResolved={onToggleResolved}
                  deleting={deletingId === bug.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}