import PortalView from './PortalView'

// Public, token-gated client portal — no agency login required.
export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PortalView token={token} />
}
