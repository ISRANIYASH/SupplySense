'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DIGIT_COUNT = 6
const RESEND_TIMEOUT = 30

export default function MFAPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = cleaned
    setDigits(newDigits)

    if (cleaned && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newDigits.every((d) => d !== '') && newDigits.join('').length === DIGIT_COUNT) {
      handleVerify(newDigits.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT)
    if (pasted.length === DIGIT_COUNT) {
      const newDigits = pasted.split('')
      setDigits(newDigits)
      inputRefs.current[DIGIT_COUNT - 1]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setIsVerifying(true)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      // Demo: accept any 6-digit code
      if (code.length === DIGIT_COUNT) {
        setIsVerified(true)
        toast.success('MFA verified successfully!')
        await new Promise((r) => setTimeout(r, 800))
        router.push('/')
      } else {
        toast.error('Invalid code. Please try again.')
        setDigits(Array(DIGIT_COUNT).fill(''))
        inputRefs.current[0]?.focus()
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = () => {
    if (!canResend) return
    setCountdown(RESEND_TIMEOUT)
    setCanResend(false)
    setDigits(Array(DIGIT_COUNT).fill(''))
    inputRefs.current[0]?.focus()
    toast.success('New verification code sent!')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0A0F1E' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div
          className="p-8 rounded-2xl space-y-6"
          style={{
            background: 'rgba(17,24,39,0.8)',
            border: '1px solid rgba(59,142,232,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <motion.div
              animate={isVerified ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: isVerified
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(59,142,232,0.12)',
                border: `1px solid ${isVerified ? 'rgba(16,185,129,0.3)' : 'rgba(59,142,232,0.25)'}`,
              }}
            >
              {isVerified ? (
                <CheckCircle2 size={28} style={{ color: '#10B981' }} />
              ) : (
                <Shield size={28} style={{ color: '#3B8EE8' }} />
              )}
            </motion.div>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-white">Two-Factor Authentication</h1>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Enter the 6-digit code from your authenticator app or SMS to
              <span className="text-blue-400"> •••@supplysense.ai</span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl transition-all duration-150 focus:outline-none"
                style={{
                  background: 'rgba(28,37,55,0.8)',
                  border: `2px solid ${digit ? 'rgba(59,142,232,0.6)' : 'rgba(30,45,69,0.8)'}`,
                  color: '#F1F5F9',
                  boxShadow: digit ? '0 0 12px rgba(59,142,232,0.2)' : 'none',
                }}
                disabled={isVerifying || isVerified}
              />
            ))}
          </div>

          {/* Verify Button */}
          <motion.button
            onClick={() => handleVerify(digits.join(''))}
            disabled={digits.some((d) => !d) || isVerifying || isVerified}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #3B8EE8 0%, #2563EB 100%)',
              color: 'white',
              opacity: digits.some((d) => !d) || isVerifying || isVerified ? 0.6 : 1,
            }}
          >
            {isVerifying ? (
              <><Loader2 size={16} className="animate-spin" /> Verifying…</>
            ) : isVerified ? (
              <><CheckCircle2 size={16} /> Verified!</>
            ) : (
              'Verify Code'
            )}
          </motion.button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="flex items-center gap-2 mx-auto text-sm font-medium transition-colors"
                style={{ color: '#3B8EE8' }}
              >
                <RefreshCw size={14} />
                Resend verification code
              </button>
            ) : (
              <p className="text-sm" style={{ color: '#64748B' }}>
                Resend code in{' '}
                <span className="font-mono font-semibold" style={{ color: '#94A3B8' }}>
                  {countdown}s
                </span>
              </p>
            )}
          </div>

          {/* Back */}
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm transition-colors"
              style={{ color: '#64748B' }}
            >
              ← Back to login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
