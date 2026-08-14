import { SidebarProvider } from "@workspace/ui/components/sidebar"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="">
      {children}
    </SidebarProvider>
  )
}

