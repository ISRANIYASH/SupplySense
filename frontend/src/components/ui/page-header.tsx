'use client';
import React from 'react';
import { motion } from 'framer-motion';

export function PageHeader({ 
  title, 
  subtitle, 
  badge, 
  children 
}: { 
  title: string, 
  subtitle?: string, 
  badge?: React.ReactNode, 
  children?: React.ReactNode 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </motion.div>
  );
}
