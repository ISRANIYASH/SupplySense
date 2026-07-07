'use client';
import React from 'react';

const variantClasses: Record<string, string> = {
  // severity
  'CRITICAL': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'HIGH': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'MEDIUM': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'LOW': 'bg-green-500/20 text-green-400 border border-green-500/30',
  // action
  'BUY': 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  'WAIT': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'REDUCE': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'TRANSFER': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'HEDGE': 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  'PARTIAL': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  // status
  'Pending': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Approved': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'InTransit': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Delivered': 'border border-green-500 text-green-400',
  'Cancelled': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'default': 'bg-gray-800 text-gray-300 border border-gray-700',
};

export function Badge({ variant, children, className = '' }: { variant: string, children: React.ReactNode, className?: string }) {
  const vClass = variantClasses[variant] || variantClasses['default'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${vClass} ${className}`}>
      {children}
    </span>
  );
}
