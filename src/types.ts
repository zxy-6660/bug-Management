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
  created_at: string
}

/** 可修改的字段 */
export type BugPatch = {
  content?: string
  remark?: string | null
  resolved?: boolean
  sort_order?: number
}
