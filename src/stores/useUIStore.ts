/**
 * Global UI state (Zustand).
 *
 * Holds cross-cutting UI concerns: sidebar collapse, mobile drawer, command palette,
 * Comfort Design System + 5-Theme Palette switcher, and global tool modals
 * (6-Axis Match Breakdown, Startup Deal Room, Need Cards Wall).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type PaletteTheme = 'stone' | 'dark' | 'cyan' | 'mint' | 'apricot' | 'lilac';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  theme: Theme;
  paletteTheme: PaletteTheme;

  // Global Modals from current CoFounderBay studio upgrades
  dealRoomModalOpen: boolean;
  matchBreakdownModalOpen: boolean;
  needWallModalOpen: boolean;
  selectedFounderId: string | null;
  selectedStartupId: string | null;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: Theme) => void;
  setPaletteTheme: (palette: PaletteTheme) => void;

  setDealRoomModalOpen: (open: boolean, startupId?: string | null) => void;
  setMatchBreakdownModalOpen: (open: boolean, founderId?: string | null) => void;
  setNeedWallModalOpen: (open: boolean) => void;
  setNeedCardWallOpen: (open: boolean) => void;
}

export function applyPaletteToDocument(palette: PaletteTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (palette === 'stone') {
    root.removeAttribute('data-theme');
    root.classList.remove('dark');
  } else {
    root.setAttribute('data-theme', palette);
    if (palette === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      commandPaletteOpen: false,
      theme: 'light',
      paletteTheme: 'stone',

      dealRoomModalOpen: false,
      matchBreakdownModalOpen: false,
      needWallModalOpen: false,
      selectedFounderId: null,
      selectedStartupId: null,

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setTheme: (theme) => set({ theme }),
      setPaletteTheme: (paletteTheme) => {
        applyPaletteToDocument(paletteTheme);
        set({ paletteTheme, theme: paletteTheme === 'dark' ? 'dark' : 'light' });
      },

      setDealRoomModalOpen: (dealRoomModalOpen, startupId = null) =>
        set({ dealRoomModalOpen, selectedStartupId: startupId }),
      setMatchBreakdownModalOpen: (matchBreakdownModalOpen, founderId = null) =>
        set({ matchBreakdownModalOpen, selectedFounderId: founderId }),
      setNeedWallModalOpen: (needWallModalOpen) => set({ needWallModalOpen }),
      setNeedCardWallOpen: (needWallModalOpen) => set({ needWallModalOpen }),
    }),
    {
      name: 'cofounderbay-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        paletteTheme: state.paletteTheme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.paletteTheme) {
          applyPaletteToDocument(state.paletteTheme);
        }
      },
    },
  ),
);

export default useUIStore;
