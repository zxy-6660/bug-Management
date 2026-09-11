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
  activeTabId: string | null
  maxTabs: number
  bugs: Bug[]
  loading: boolean
  error: string | null
  deletingId: string | null
  onSelectTab: (id: string) => void
  onCreateTab: () => void
  onRetry: () => void
  onDelete: (bug: Bug) => void
  onUpdate: (bug: Bug, patch: BugPatch) => Promise<boolean>
  onToggleResolved: (bug: Bug) => void
  onReorder: (next: Bug[]) => void
}

export default function BugList({
  tabs,
  activeTabId,
  maxTabs,
  bugs,
  loading,
  error,
  deletingId,
  onSelectTab,
  onCreateTab,
  onRetry,
  onDelete,
  onUpdate,
  onToggleResolved,
  onReorder
}: Props) {
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

  return (
    <section className="list-section">
      <div className="list-header">
        <h2 className="card-title">问题列表</h2>
        <span className="count-badge">{loading ? '加载中' : `${bugs.length} 条`}</span>
      </div>

      {/* 标签页栏 */}
      <div className="tabs-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            className={`tab-btn${tab.id === activeTabId ? ' active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
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