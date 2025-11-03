// Route segment config to force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export default function BatchSummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
