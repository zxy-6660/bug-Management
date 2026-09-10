import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createBug } from '../lib/api'
import { formatBytes } from '../lib/format'

type Props = {
  onCreated: () => void
}

export default function BugForm({ onCreated }: Props) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError('请填写问题的文字描述')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await createBug(content, files)
      setContent('')
      setFiles([])
      setSuccess(true)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card form-card">
      <h2 className="card-title">提交问题</h2>

      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="bug-content">
          问题描述 <span className="required">必填</span>
        </label>
        <textarea
          id="bug-content"
          className="textarea"
          rows={6}
          maxLength={5000}
          placeholder={'请描述遇到的问题，例如：\n1. 在哪个页面/功能\n2. 具体操作步骤\n3. 预期结果与实际结果'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
        />
        <div className="counter">{content.length} / 5000</div>

        <label className="field-label">
          附件 <span className="optional">选填，可传图片或文件</span>
        </label>

        <div className="uploader">
          <input
            ref={inputRef}
            id="bug-files"
            type="file"
            multiple
            className="file-input"
            onChange={handlePick}
            disabled={submitting}
          />
          <label htmlFor="bug-files" className={submitting ? 'upload-btn disabled' : 'upload-btn'}>
            <span className="upload-icon">+</span>
            选择图片或文件
          </label>
          <span className="upload-hint">单个文件不超过 20MB，可多选</span>
        </div>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="file-item">
                <span className="file-name" title={file.name}>
                  {file.name}
                </span>
                <span className="file-size">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="file-remove"
                  onClick={() => removeFile(index)}
                  disabled={submitting}
                  aria-label={`移除 ${file.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">提交成功，已在下方列表中展示。</p>}

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? '提交中…' : '提交问题'}
        </button>
      </form>
    </section>
  )
}
