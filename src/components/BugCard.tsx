import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getAttachmentUrl } from '../lib/api'
import { formatBytes } from '../lib/format'
import type { Bug, BugPatch } from '../types'

type Props = {
  bug: Bug
  onDelete: (bug: Bug) => void
  onUpdate: (bug: Bug, patch: BugPatch) => Promise<boolean>
  onToggleResolved: (bug: Bug) => void
  deleting: boolean
}

export default function BugCard({ bug, onDelete, onUpdate, onToggleResolved, deleting }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingRemark, setEditingRemark] = useState(false)
  const [draft, setDraft] = useState(bug.content)
  const [remarkDraft, setRemarkDraft] = useState(bug.remark ?? '')
  const [saving, setSaving] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bug.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const attachments = bug.attachments ?? []
  const images = attachments.filter((a) => a.type.startsWith('image/'))
  const others = attachments.filter((a) => !a.type.startsWith('image/'))

  const contentChanged = draft.trim() !== '' && draft.trim() !== bug.content
  const remarkChanged = remarkDraft.trim() !== (bug.remark ?? '')
  const canSave = editing ? contentChanged : remarkChanged

  function startEditContent() {
    setEditingRemark(false)
    setDraft(bug.content)
    setEditing(true)
  }

  function startEditRemark() {
    setEditing(false)
    setRemarkDraft(bug.remark ?? '')
    setEditingRemark(true)
  }

  function cancelEdit() {
    setDraft(bug.content)
    setRemarkDraft(bug.remark ?? '')
    setEditing(false)
    setEditingRemark(false)
  }

  async function saveContent() {
    setSaving(true)
    const ok = await onUpdate(bug, { content: draft.trim() })
    setSaving(false)
    if (ok) setEditing(false)
  }

  async function saveRemark() {
    const next = remarkDraft.trim()
    setSaving(true)
    // 清空备注时写回 null，避免库里出现空字符串
    const ok = await onUpdate(bug, { remark: next === '' ? null : next })
    setSaving(false)
    if (ok) setEditingRemark(false)
  }

  return (
    <article
      className={`card bug-card${isDragging ? ' dragging' : ''}${bug.resolved ? ' resolved' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <div className="bug-head">
        {bug.resolved && <span className="resolve-chip">✔ 已解决</span>}
        <button
          type="button"
          className={bug.resolved ? 'resolve-btn on' : 'resolve-btn'}
          onClick={() => onToggleResolved(bug)}
          disabled={saving}
        >
          {bug.resolved ? '恢复未解决' : '已解决'}
        </button>
      </div>
      {editing ? (
        <textarea
          className="edit-area"
          rows={5}
          maxLength={5000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit()
          }}
          disabled={saving}
          autoFocus
        />
      ) : (
        <p className="bug-content">{bug.content}</p>
      )}

      {editingRemark ? (
        <textarea
          className="edit-area remark-area"
          rows={3}
          maxLength={2000}
          placeholder="补充说明、处理进展、结论等"
          value={remarkDraft}
          onChange={(e) => setRemarkDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit()
          }}
          disabled={saving}
          autoFocus
        />
      ) : (
        bug.remark && (
          <div className="bug-remark">
            <span className="bug-remark-label">备注</span>
            {bug.remark}
          </div>
        )
      )}

      {images.length > 0 && (
        <div className="thumb-grid">
          {images.map((img) => (
            <a
              key={img.path}
              href={getAttachmentUrl(img.path)}
              target="_blank"
              rel="noreferrer"
              className="thumb"
              title={img.name}
            >
              <img src={getAttachmentUrl(img.path)} alt={img.name} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <ul className="attachment-list">
          {others.map((file) => (
            <li key={file.path}>
              <a href={getAttachmentUrl(file.path)} target="_blank" rel="noreferrer" className="attachment-link">
                <span className="attachment-name">{file.name}</span>
                <span className="attachment-size">{formatBytes(file.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="bug-footer">
        {editing || editingRemark ? (
          <span className="action-group">
            <button
              type="button"
              className="save-btn"
              onClick={editing ? saveContent : saveRemark}
              disabled={saving || !canSave}
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button type="button" className="ghost-btn" onClick={cancelEdit} disabled={saving}>
              取消
            </button>
          </span>
        ) : confirming ? (
          <span className="action-group">
            <span className="confirm-text">确认删除？不可恢复</span>
            <button type="button" className="danger-btn" onClick={() => onDelete(bug)} disabled={deleting}>
              {deleting ? '删除中…' : '确认删除'}
            </button>
            <button type="button" className="ghost-btn" onClick={() => setConfirming(false)} disabled={deleting}>
              取消
            </button>
          </span>
        ) : (
          <span className="action-group">
            <button
              type="button"
              className="drag-handle"
              aria-label="拖动排序"
              title="按住拖动调整顺序"
              {...attributes}
              {...listeners}
            >
              ≡
            </button>
            <button type="button" className="edit-btn" onClick={startEditContent}>
              编辑
            </button>
            <button type="button" className="edit-btn" onClick={startEditRemark}>
              {bug.remark ? '改备注' : '备注'}
            </button>
            <button type="button" className="ghost-btn" onClick={() => setConfirming(true)}>
              删除
            </button>
          </span>
        )}
      </footer>
    </article>
  )
}
