import { useState } from 'react'
import { getAttachmentUrl } from '../lib/api'
import { formatBytes, formatTime } from '../lib/format'
import type { Bug } from '../types'

type Props = {
  bug: Bug
  onDelete: (bug: Bug) => void
  onSave: (bug: Bug, content: string) => Promise<boolean>
  deleting: boolean
}

export default function BugCard({ bug, onDelete, onSave, deleting }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bug.content)
  const [saving, setSaving] = useState(false)

  const attachments = bug.attachments ?? []
  const images = attachments.filter((a) => a.type.startsWith('image/'))
  const others = attachments.filter((a) => !a.type.startsWith('image/'))
  const draftChanged = draft.trim() !== '' && draft.trim() !== bug.content

  function startEdit() {
    setDraft(bug.content)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(bug.content)
    setEditing(false)
  }

  async function saveEdit() {
    setSaving(true)
    const ok = await onSave(bug, draft)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <article className="card bug-card">
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
        <time className="bug-time" dateTime={bug.created_at}>
          {formatTime(bug.created_at)}
        </time>

        {editing ? (
          <span className="action-group">
            <button
              type="button"
              className="save-btn"
              onClick={saveEdit}
              disabled={saving || !draftChanged}
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
            <button type="button" className="edit-btn" onClick={startEdit}>
              编辑
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
