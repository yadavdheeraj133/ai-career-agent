import { RequireAuth } from "@/lib/require-auth";

export default function FeaturesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireAuth>{children}</RequireAuth>;
}
