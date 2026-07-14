export type UserRole = 'agency' | 'influencer' | 'admin'
export type AccessType = 'trial' | 'standard' | 'vip' | 'lifetime' | 'none'

export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  access_type: AccessType
  trial_start: string | null
  trial_end: string | null
  trial_ip: string | null
  stripe_customer_id: string | null
  lifetime_access: boolean
  created_at: string
}

export interface Influencer {
  id: string
  name: string
  niche: string
  platform: string
  subscribers: number
  avg_views: number
  engagement_rate: number
  email: string | null
  country: string
  language?: string
  created_at: string
  last_contacted_at?: string | null
  contacted_by?: string | null
  // Curated discovery fields (0020). Optional: absent until the migration is applied.
  quality_score?: number | null
  vetting_status?: 'unvetted' | 'pending' | 'vetted' | 'rejected' | null
  brand_safety_flags?: string[] | null
}

export interface TrialSignup {
  email: string
  ip: string
  trial_end: string
}

export const NICHES = [
  'Tech', 'Beauty', 'Fitness', 'Gaming', 'Food',
  'Travel', 'Finance', 'Fashion', 'Lifestyle', 'Business', 'Education',
]

export const TIERS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

export const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Twitch', 'LinkedIn', 'Twitter/X']
