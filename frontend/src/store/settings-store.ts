/**
 * User preferences. Persisted to localStorage via zustand/persist.
 * Theme (light/dark/system) is handled separately by next-themes.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setSimulatedLatency } from '@/api'
import { DEFAULT_SETTINGS, type UserSettings } from '@/domain'
import { DEMO_USER } from '@/data/demo-user'

interface SettingsState extends UserSettings {
  update(patch: Partial<UserSettings>): void
  reset(): void
}

const INITIAL: UserSettings = { ...DEFAULT_SETTINGS, displayName: DEMO_USER.name }

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...INITIAL,
      update: (patch) => set(patch),
      reset: () => set(INITIAL),
    }),
    {
      name: 'pf.settings',
      version: 1,
      partialize: (s) => ({
        displayName: s.displayName,
        defaultCurrency: s.defaultCurrency,
        dateFormat: s.dateFormat,
        numberLocale: s.numberLocale,
        defaultDashboardPeriod: s.defaultDashboardPeriod,
        budgetWarningThreshold: s.budgetWarningThreshold,
        simulateLatency: s.simulateLatency,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) setSimulatedLatency(state.simulateLatency)
      },
    },
  ),
)

// Keep the mock API's latency flag in sync with the preference.
useSettingsStore.subscribe((s, prev) => {
  if (s.simulateLatency !== prev.simulateLatency) setSimulatedLatency(s.simulateLatency)
})
setSimulatedLatency(useSettingsStore.getState().simulateLatency)
