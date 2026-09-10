export type Attachment = {
  path: string
  name: string
  type: string
  size: number
}

export type Bug = {
  id: string
  content: string
  attachments: Attachment[]
  created_at: string
}
