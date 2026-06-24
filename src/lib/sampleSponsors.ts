export interface SampleSponsor {
  id: string
  name: string
  industry: string
  typical_budget: string
  description: string
  niche: string
}

// Bundled sponsors per niche so Sponsor Matching works before the Supabase
// `sponsors` table is seeded. Real DB rows take priority when present.
const RAW: Record<string, [string, string, string][]> = {
  Tech: [['Nvidia', '$10K-$100K', 'GPUs and AI hardware'], ['Squarespace', '$2K-$15K', 'Website builder'], ['NordVPN', '$3K-$30K', 'Privacy and VPN'], ['Notion', '$5K-$40K', 'Productivity software'], ['1Password', '$3K-$25K', 'Password manager'], ['Brilliant', '$2K-$12K', 'Interactive learning']],
  Gaming: [['Razer', '$5K-$60K', 'Gaming peripherals'], ['SteelSeries', '$4K-$40K', 'Esports gear'], ['Logitech G', '$5K-$50K', 'Gaming hardware'], ['Elgato', '$3K-$30K', 'Streaming gear'], ['Corsair', '$5K-$45K', 'PC components'], ['Discord', '$4K-$35K', 'Community chat']],
  Finance: [['Robinhood', '$8K-$70K', 'Investing app'], ['Coinbase', '$10K-$90K', 'Crypto exchange'], ['Wealthsimple', '$5K-$40K', 'Wealth management'], ['Ramp', '$8K-$60K', 'Corporate cards'], ['NerdWallet', '$4K-$30K', 'Personal finance'], ['Public', '$5K-$45K', 'Stock investing']],
  Beauty: [['Sephora', '$8K-$80K', 'Beauty retail'], ['Glossier', '$5K-$40K', 'Skincare and makeup'], ['Fenty Beauty', '$10K-$90K', 'Inclusive makeup'], ['The Ordinary', '$3K-$25K', 'Affordable skincare'], ['Rare Beauty', '$6K-$50K', 'Makeup brand'], ['CeraVe', '$4K-$35K', 'Dermatologist skincare']],
  Fitness: [['Gymshark', '$6K-$55K', 'Fitness apparel'], ['MyProtein', '$4K-$35K', 'Supplements'], ['Whoop', '$8K-$60K', 'Fitness wearable'], ['Alo Yoga', '$6K-$50K', 'Yoga apparel'], ['Peloton', '$10K-$85K', 'Connected fitness'], ['Optimum Nutrition', '$4K-$30K', 'Sports nutrition']],
  Food: [['HelloFresh', '$8K-$70K', 'Meal kits'], ['Magic Spoon', '$3K-$25K', 'Healthy cereal'], ['Blue Apron', '$5K-$40K', 'Meal delivery'], ['Athletic Greens', '$10K-$80K', 'Nutrition drink'], ['Liquid Death', '$5K-$45K', 'Canned water'], ['Factor', '$6K-$50K', 'Prepared meals']],
  Fashion: [['ASOS', '$6K-$55K', 'Online fashion'], ['Revolve', '$8K-$70K', 'Designer fashion'], ['SSENSE', '$10K-$90K', 'Luxury retail'], ['Princess Polly', '$4K-$35K', 'Trendy apparel'], ['Aritzia', '$8K-$65K', 'Everyday luxury'], ['Shein', '$5K-$45K', 'Fast fashion']],
  Travel: [['Booking.com', '$10K-$95K', 'Travel booking'], ['Expedia', '$8K-$80K', 'Travel platform'], ['Airbnb', '$10K-$100K', 'Stays and experiences'], ['Hostelworld', '$3K-$25K', 'Budget travel'], ['NordVPN', '$3K-$30K', 'Travel-safe VPN'], ['Away', '$5K-$45K', 'Luggage']],
  Education: [['Coursera', '$6K-$50K', 'Online courses'], ['Skillshare', '$4K-$35K', 'Creative classes'], ['Brilliant', '$3K-$25K', 'STEM learning'], ['Grammarly', '$8K-$70K', 'Writing assistant'], ['Babbel', '$5K-$40K', 'Language learning'], ['MasterClass', '$8K-$75K', 'Expert classes']],
  Business: [['HubSpot', '$10K-$90K', 'CRM and marketing'], ['Shopify', '$10K-$95K', 'E-commerce platform'], ['Monday.com', '$6K-$55K', 'Work management'], ['QuickBooks', '$5K-$45K', 'Accounting'], ['Fiverr', '$4K-$35K', 'Freelance marketplace'], ['LinkedIn', '$8K-$80K', 'Professional network']],
  Lifestyle: [['Amazon', '$10K-$100K', 'Everything store'], ['Canva', '$6K-$50K', 'Design tool'], ['Airbnb', '$10K-$90K', 'Stays'], ['Audible', '$5K-$45K', 'Audiobooks'], ['Calm', '$5K-$40K', 'Meditation app'], ['Ridge', '$4K-$35K', 'Wallets and EDC']],
}

export const SAMPLE_SPONSORS: SampleSponsor[] = Object.entries(RAW).flatMap(([niche, rows]) =>
  rows.map(([name, budget, desc], i) => ({
    id: `samp-${niche}-${i}`,
    name,
    industry: niche,
    typical_budget: budget,
    description: desc,
    niche,
  }))
)
