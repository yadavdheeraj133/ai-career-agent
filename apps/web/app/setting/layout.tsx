import { RequireAuth } from "@/lib/require-auth";

export default function SettingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireAuth>{children}</RequireAuth>;
}
