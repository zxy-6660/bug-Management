import { ATTACHMENT_BUCKET, MAX_FILE_SIZE, supabase } from './supabase'
import type { Attachment, Bug } from '../types'

/** 读取全部问题，按提交时间倒序 */
export async function fetchBugs(): Promise<Bug[]> {
  const { data, error } = await supabase
    .from('bugs')
    .select('id, content, attachments, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`加载失败：${error.message}`)
  return (data ?? []) as Bug[]
}

/**
 * 生成符合 Storage 规范的路径名。
 * Supabase Storage 的 key 只接受 ASCII 字符，中文等非 ASCII 字符会导致 Invalid key 错误，
 * 因此这里统一转成 ASCII，原始文件名仍保存在数据库的 name 字段中用于展示。
 */
function sanitizeFileName(name: string) {
  const extMatch = name.match(/\.[A-Za-z0-9]{1,10}$/)
  const ext = extMatch ? extMatch[0].toLowerCase() : ''
  const base = (ext ? name.slice(0, -ext.length) : name)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, 60)

  return `${base || 'file'}${ext}`
}

/**
 * 提交一条问题：先上传附件到 Storage，再写入数据库。
 * 若写库失败，会回滚已上传的附件，避免产生孤儿文件。
 */
export async function createBug(content: string, files: File[]): Promise<void> {
  const attachments: Attachment[] = []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`附件「${file.name}」超过 20MB 上限`)
    }

    const path = `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`
    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (error) throw new Error(`附件「${file.name}」上传失败：${error.message}`)

    attachments.push({ path, name: file.name, type: file.type, size: file.size })
  }

  const { error } = await supabase
    .from('bugs')
    .insert({ content: content.trim(), attachments })

  if (error) {
    if (attachments.length > 0) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove(attachments.map((a) => a.path))
    }
    throw new Error(`提交失败：${error.message}`)
  }
}

/**
 * 修改问题描述。
 * 加了 .select() 是为了确认真的更新到了行：RLS 拦截时 PostgREST 不会报错，
 * 只会影响 0 行，不检查就会变成「提示成功但内容没变」。
 */
export async function updateBugContent(id: string, content: string): Promise<void> {
  const { data, error } = await supabase
    .from('bugs')
    .update({ content: content.trim() })
    .eq('id', id)
    .select('id')

  if (error) throw new Error(`保存失败：${error.message}`)
  if (!data || data.length === 0) throw new Error('保存失败：记录不存在，或数据库缺少 update 策略')
}

/** 删除问题记录，并清理其附件 */
export async function deleteBug(bug: Bug): Promise<void> {
  const { error } = await supabase.from('bugs').delete().eq('id', bug.id)
  if (error) throw new Error(`删除失败：${error.message}`)

  const paths = (bug.attachments ?? []).map((a) => a.path)
  if (paths.length > 0) {
    // 记录已删除，附件清理失败不影响主流程
    await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths)
  }
}

/** 获取附件的公开访问地址 */
export function getAttachmentUrl(path: string): string {
  return supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path).data.publicUrl
}
