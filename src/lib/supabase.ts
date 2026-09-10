import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 配置：请在项目根目录创建 .env.local（可复制 .env.example），填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 后重新启动。'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const ATTACHMENT_BUCKET = 'bug-attachments'

export const MAX_FILE_SIZE = 20 * 1024 * 1024
