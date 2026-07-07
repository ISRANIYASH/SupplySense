'use client';
import React from 'react';

export function ChartWrapper({ 
  title, 
  subtitle, 
  action, 
  children, 
  minHeight = '300px' 
}: { 
  title: string, 
  subtitle?: string, 
  action?: React.ReactNode, 
  children: React.ReactNode, 
  minHeight?: string 
}) {
  return (
    <div className="bg-[#111827] border border-[#1E2D45] rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-grow w-full relative" style={{ minHeight }}>
        {children}
      </div>
    </div>
  );
}
