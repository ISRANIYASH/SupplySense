'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, ShieldCheck, Zap, TrendingUp, Users } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useDispatch, useSelector } from 'react-redux'
import { setUser, selectIsAuthenticated } from '@/lib/store/authSlice'
import { ROLE_PERMISSIONS, getRoleLabel } from '@/lib/auth/permissions'
import type { Role } from '@/lib/auth/permissions'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const demoUsers: Array<{ role: Role; email: string; password: string; name: string }> = [
  { role: 'super_admin', email: 'superadmin@supplysense.ai', password: 'demo1234', name: 'Alex Rivera' },
  { role: 'admin', email: 'admin@supplysense.ai', password: 'demo1234', name: 'Sam Chen' },
  { role: 'procurement_manager', email: 'procurement@supplysense.ai', password: 'demo1234', name: 'Jordan Blake' },
  { role: 'warehouse_manager', email: 'warehouse@supplysense.ai', password: 'demo1234', name: 'Morgan Kim' },
  { role: 'forecast_analyst', email: 'analyst@supplysense.ai', password: 'demo1234', name: 'Taylor Singh' },
  { role: 'viewer', email: 'viewer@supplysense.ai', password: 'demo1234', name: 'Casey Patel' },
]

const statsCards = [
  { icon: TrendingUp, label: 'Supply chain optimized', value: '$2.4B', color: '#00D4AA' },
  { icon: ShieldCheck, label: 'Platform uptime', value: '99.7%', color: '#3B8EE8' },
  { icon: Zap, label: 'AI agents active', value: '8 agents', color: '#F59E0B' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch()
  const { data: session, status } = useSession()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  // Validate destination to prevent open-redirect vulnerabilities
  const rawCallback = searchParams?.get('callbackUrl')
  const callbackUrl = (rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//'))
    ? rawCallback
    : '/'

  // Redirect if user is already authenticated
  useEffect(() => {
    if (status === 'authenticated' || isAuthenticated) {
      router.replace(callbackUrl)
    }
  }, [status, isAuthenticated, callbackUrl, router])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      // 1. Establish persistent NextAuth session
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid credentials. Please try again or use a demo account below.')
        setIsLoading(false)
        return
      }

      // 2. Identify user role & metadata
      const demoUser = demoUsers.find(
        (u) => u.email.toLowerCase() === data.email.toLowerCase()
      )
      const role: Role = demoUser?.role || 'admin'
      const userObj = {
        id: demoUser ? `user-${demoUser.role}` : `user-${Date.now()}`,
        name: demoUser?.name || data.email.split('@')[0],
        email: data.email,
        role,
        permissions: ROLE_PERMISSIONS[role],
        department: getRoleLabel(role),
        lastLogin: new Date().toISOString(),
      }

      // 3. Persist to Redux and localStorage
      dispatch(setUser(userObj))
      try {
        localStorage.setItem('supplysense_session', JSON.stringify(userObj))
      } catch {}

      toast.success(`Welcome back, ${userObj.name}!`)
      router.replace(callbackUrl)
    } catch {
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (demoUser: typeof demoUsers[0]) => {
    setDemoLoading(demoUser.role)
    setValue('email', demoUser.email)
    setValue('password', demoUser.password)

    try {
      // 1. Establish NextAuth session
      await signIn('credentials', {
        email: demoUser.email,
        password: demoUser.password,
        redirect: false,
      })

      const userObj = {
        id: `user-${demoUser.role}`,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        permissions: ROLE_PERMISSIONS[demoUser.role],
        department: getRoleLabel(demoUser.role),
        lastLogin: new Date().toISOString(),
      }

      // 2. Persist to Redux and localStorage
      dispatch(setUser(userObj))
      try {
        localStorage.setItem('supplysense_session', JSON.stringify(userObj))
      } catch {}

      toast.success(`Signed in as ${demoUser.name} (${getRoleLabel(demoUser.role)})`)
      router.replace(callbackUrl)
    } catch {
      toast.error('Demo sign-in failed. Please try again.')
    } finally {
      setDemoLoading(null)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      // Check whether Google OAuth is configured
      const providers = await fetch('/api/auth/providers').then((r) => r.json()).catch(() => ({}))
      if (!providers?.google) {
        toast.error(
          'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Google Cloud Console and environment variables.',
          { duration: 6000 }
        )
        setIsLoading(false)
        return
      }

      await signIn('google', { callbackUrl })
    } catch (err: any) {
      toast.error('Google sign-in could not be initiated: ' + (err?.message || 'Unknown error'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0F1E' }}>
      {/* ── Left Panel ── */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[52%] p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0D1526 0%, #0A0F1E 60%, #0D1A2E 100%)',
        }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #3B8EE8 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-24 right-0 w-80 h-80 rounded-full opacity-8"
            style={{ background: 'radial-gradient(circle, #00D4AA 0%, transparent 70%)' }}
          />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3B8EE8 0%, #00D4AA 100%)' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L19 7V15L11 20L3 15V7L11 2Z" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="11" cy="11" r="2" fill="white" />
              <path d="M11 2V11M19 7L11 11M3 7L11 11" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">SupplySense</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-2 font-medium" style={{ background: 'rgba(59,142,232,0.15)', color: '#3B8EE8', border: '1px solid rgba(59,142,232,0.3)' }}>
              SC-OS v3.0
            </span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
            Autonomous AI Supply Chain Intelligence
          </div>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Next-Gen Supply Chain <br />
            <span style={{ background: 'linear-gradient(90deg, #3B8EE8 0%, #00D4AA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Command Center
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: '#94A3B8' }}>
            Empower enterprise operations with autonomous multi-agent intelligence, multi-tier supply chain visibility, predictive demand modeling, and real-time inventory tracking.
          </p>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {statsCards.map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(17,24,39,0.7)',
                  border: '1px solid #1E2D45',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <stat.icon size={18} style={{ color: stat.color, marginBottom: 8 }} />
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs" style={{ color: '#475569' }}>
          <span>Enterprise SSO &amp; Role-Based Access Control</span>
          <span>SOC2 Type II • ISO 27001 Certified</span>
        </div>
      </motion.div>

      {/* ── Right Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-20 py-12"
      >
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B8EE8 0%, #00D4AA 100%)' }}
            >
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L19 7V15L11 20L3 15V7L11 2Z" stroke="white" strokeWidth="1.5" fill="none" />
                <circle cx="11" cy="11" r="2" fill="white" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">SupplySense</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
              Sign in to your SupplySense workspace
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl transition-all duration-200 hover:opacity-90"
            style={{
              background: 'rgba(28,37,55,0.8)',
              border: '1px solid rgba(59,142,232,0.2)',
              color: '#F1F5F9',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
            <span className="px-3 text-xs" style={{ color: '#64748B' }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#94A3B8' }}>
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                style={{
                  background: 'rgba(28,37,55,0.8)',
                  border: errors.email ? '1px solid #EF4444' : '1px solid rgba(59,142,232,0.2)',
                  color: '#F1F5F9',
                }}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#94A3B8' }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'rgba(28,37,55,0.8)',
                    border: errors.password ? '1px solid #EF4444' : '1px solid rgba(59,142,232,0.2)',
                    color: '#F1F5F9',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: '#64748B' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" style={{ accentColor: '#3B8EE8' }} />
                <span className="text-sm" style={{ color: '#64748B' }}>Remember me</span>
              </label>
              <button type="button" className="text-sm" style={{ color: '#3B8EE8' }}>
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #3B8EE8 0%, #2563EB 100%)',
                color: 'white',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                'Sign in'
              )}
            </motion.button>
          </form>

          {/* Demo accounts */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <motion.button
                  key={u.role}
                  onClick={() => handleDemoLogin(u)}
                  disabled={demoLoading !== null}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200"
                  style={{
                    background: 'rgba(28,37,55,0.6)',
                    border: '1px solid rgba(59,142,232,0.12)',
                    color: '#94A3B8',
                    opacity: demoLoading && demoLoading !== u.role ? 0.5 : 1,
                  }}
                >
                  {demoLoading === u.role ? (
                    <Loader2 size={12} className="animate-spin flex-shrink-0" style={{ color: '#3B8EE8' }} />
                  ) : (
                    <Users size={12} className="flex-shrink-0" style={{ color: '#3B8EE8' }} />
                  )}
                  <span className="text-xs truncate">{getRoleLabel(u.role)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
