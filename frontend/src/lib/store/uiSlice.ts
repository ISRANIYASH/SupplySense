import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  title: string
  message: string
  timestamp: string
  read: boolean
  source?: string
}

interface UiState {
  sidebarCollapsed: boolean
  activeModule: string
  notifications: Notification[]
  unreadCount: number
  copilotOpen: boolean
  commandPaletteOpen: boolean
  theme: 'dark' | 'light'
}

const initialState: UiState = {
  sidebarCollapsed: false,
  activeModule: 'dashboard',
  notifications: [],
  unreadCount: 0,
  copilotOpen: false,
  commandPaletteOpen: false,
  theme: 'dark',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload
    },
    setActiveModule(state, action: PayloadAction<string>) {
      state.activeModule = action.payload
    },
    addNotification(state, action: PayloadAction<Omit<Notification, 'id' | 'read'>>) {
      const notification: Notification = {
        ...action.payload,
        id: `notif-${Date.now()}-${Math.random()}`,
        read: false,
      }
      state.notifications.unshift(notification)
      state.unreadCount += 1
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const notif = state.notifications.find((n) => n.id === action.payload)
      if (notif && !notif.read) {
        notif.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllNotificationsRead(state) {
      state.notifications.forEach((n) => { n.read = true })
      state.unreadCount = 0
    },
    clearNotifications(state) {
      state.notifications = []
      state.unreadCount = 0
    },
    setCopilotOpen(state, action: PayloadAction<boolean>) {
      state.copilotOpen = action.payload
    },
    toggleCopilot(state) {
      state.copilotOpen = !state.copilotOpen
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload
    },
  },
})

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setActiveModule,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  setCopilotOpen,
  toggleCopilot,
  setCommandPaletteOpen,
} = uiSlice.actions

export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed
export const selectActiveModule = (state: RootState) => state.ui.activeModule
export const selectNotifications = (state: RootState) => state.ui.notifications
export const selectUnreadCount = (state: RootState) => state.ui.unreadCount
export const selectCopilotOpen = (state: RootState) => state.ui.copilotOpen
export const selectCommandPaletteOpen = (state: RootState) => state.ui.commandPaletteOpen

export default uiSlice.reducer
