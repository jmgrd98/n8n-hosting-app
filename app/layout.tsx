// Root layout — just provides the basic HTML structure.
// The locale-specific layout handles providers and translations.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
