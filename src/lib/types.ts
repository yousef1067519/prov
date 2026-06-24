export type UserRole = 'agency' | 'influencer' | 'admin'
export type AccessType = 'trial' | 'lifetime' | 'none'

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
  created_at: string
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
