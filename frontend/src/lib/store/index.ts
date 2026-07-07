import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import uiReducer from './uiSlice'
import agentsReducer from './agentsSlice'
import alertsReducer from './alertsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    agents: agentsReducer,
    alerts: alertsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date objects in state
        ignoredActions: ['agents/setDecisions'],
        ignoredPaths: ['agents.decisions'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
