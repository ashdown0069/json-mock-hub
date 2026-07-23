import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface FileBrowserStore {
  activeItem: string
  setActiveItem: (item: string) => void
}

export const useFileBrowser = create<FileBrowserStore>()(
  devtools(
    (set) => ({
      activeItem: "",
      setActiveItem: (item) =>
        set(
          (state) => (state.activeItem === item ? state : { activeItem: item }),
          false,
          "setActiveItem"
        ),
    }),
    {
      name: "FileBrowser Store",
      enabled: process.env.NODE_ENV === "development",
    }
  )
)
