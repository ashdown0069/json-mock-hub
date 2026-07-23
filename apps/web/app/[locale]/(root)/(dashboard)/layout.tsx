import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="">
      <TooltipProvider>{children}</TooltipProvider>
    </SidebarProvider>
  )
}
