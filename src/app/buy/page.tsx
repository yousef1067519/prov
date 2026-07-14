import { redirect } from 'next/navigation'

// ENTERPRISE (§8.1): self-serve checkout removed. Enterprise is sales-led.
export default function BuyRedirect() {
  redirect('/demo')
}
