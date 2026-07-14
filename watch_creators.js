const fs = require('fs')
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2] }
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  for (let i = 0; i < 240; i++) { // ~2h max at 30s
    // Ignore connection-test / healthcheck rows — only fire on real creators.
    const { count, error } = await sb.from('creators').select('*', { count: 'exact', head: true })
      .not('source', 'in', '("healthcheck","probe","manual-test")')
    if (!error && count > 0) {
      const { data } = await sb.from('creators').select('name,platform,subscribers,source').order('created_at', { ascending: false }).limit(3)
      console.log('CREATORS_ARRIVED count=' + count + ' sample=' + JSON.stringify(data))
      process.exit(0)
    }
    await sleep(30000)
  }
  console.log('WATCH_TIMEOUT still 0 after ~2h')
})()
