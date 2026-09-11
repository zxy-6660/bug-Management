export type Attachment = {
  path: string
  name: string
  type: string
  size: number
}

export type Bug = {
  id: string
  content: string
  remark: string | null
  attachments: Attachment[]
  sort_order: number
  resolved: boolean
  tab_id: string | null
  created_at: string
}

/** 问题标签页 */
export type Tab = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

/** 可修改的字段 */
export type BugPatch = {
  content?: string
  remark?: string | null
  resolved?: boolean
  sort_order?: number
}
