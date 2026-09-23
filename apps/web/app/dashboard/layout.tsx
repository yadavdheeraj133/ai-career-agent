import { RequireAuth } from "@/lib/require-auth";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireAuth>{children}</RequireAuth>;
}
