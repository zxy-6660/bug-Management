import BugCard from './BugCard'
import type { Bug } from '../types'

type Props = {
  bugs: Bug[]
  loading: boolean
  error: string | null
  deletingId: string | null
  onRetry: () => void
  onDelete: (bug: Bug) => void
}

export default function BugList({ bugs, loading, error, deletingId, onRetry, onDelete }: Props) {
  return (
    <section className="list-section">
      <div className="list-header">
        <h2 className="card-title">问题列表</h2>
        <span className="count-badge">{loading ? '加载中' : `${bugs.length} 条`}</span>
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

      {!loading &&
        !error &&
        bugs.map((bug) => (
          <BugCard key={bug.id} bug={bug} onDelete={onDelete} deleting={deletingId === bug.id} />
        ))}
    </section>
  )
}
