import { ApisExplorer } from "@/features/file-browser/components/ApisExplorer"

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ApisExplorer />
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </>
  )
}
