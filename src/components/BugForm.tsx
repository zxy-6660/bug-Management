import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createBug } from '../lib/api'
import { formatBytes } from '../lib/format'

type Props = {
  onCreated: () => void
}

const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg'
}

/** 截图粘贴时剪贴板给的是 image.png 这类通用名，换成带时间的名字便于区分 */
const GENERIC_IMAGE_NAME = /^image\.(png|jpe?g|gif|webp|bmp)$/i

function localTimeStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function normalizeClipboardFile(file: File, index: number) {
  if (file.name && !GENERIC_IMAGE_NAME.test(file.name)) return file

  const ext = IMAGE_EXT[file.type] ?? 'png'
  const suffix = index > 0 ? `-${index + 1}` : ''
  return new File([file], `粘贴图片-${localTimeStamp()}${suffix}.${ext}`, {
    type: file.type || 'image/png'
  })
}

/** 按「文件名 + 大小」去重后追加 */
function mergeFiles(prev: File[], incoming: File[]) {
  const merged = [...prev]
  for (const file of incoming) {
    if (!merged.some((f) => f.name === file.name && f.size === file.size)) {
      merged.push(file)
    }
  }
  return merged
}

export default function BugForm({ onCreated }: Props) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function appendFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setFiles((prev) => mergeFiles(prev, incoming))
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    appendFiles(Array.from(e.target.files ?? []))
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 监听整页的粘贴事件：在描述框里按 Ctrl+V 截图，或在页面任意位置粘贴都生效
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (submitting) return

      const items = e.clipboardData?.items
      if (!items) return

      const images: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind !== 'file' || !item.type.startsWith('image/')) continue

        const file = item.getAsFile()
        if (file) images.push(normalizeClipboardFile(file, images.length))
      }

      // 不阻止默认行为，纯文本粘贴仍会正常写入输入框
      appendFiles(images)
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [submitting])

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
          placeholder={'请描述遇到的问题\n\n\n\n\n截图可直接按 Ctrl+V 粘贴到本页'}
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
          <span className="upload-hint">单个不超过 20MB，可多选；截图可直接 Ctrl+V 粘贴</span>
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
