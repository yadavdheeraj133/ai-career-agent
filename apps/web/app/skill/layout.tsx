import { RequireAuth } from "@/lib/require-auth";

export default function SkillLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireAuth>{children}</RequireAuth>;
}
