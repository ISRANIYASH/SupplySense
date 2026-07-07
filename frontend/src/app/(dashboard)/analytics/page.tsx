'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ChartWrapper } from '@/components/ui/chart-wrapper';
import { Badge } from '@/components/ui/badge';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Analytics Lab" 
        subtitle="AI-powered insights and analytics" 
        badge={<Badge variant="HIGH">Active</Badge>} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#111827] border border-[#1E2D45] rounded-xl p-4 flex flex-col">
            <span className="text-slate-400 text-sm">Metric {i}</span>
            <span className="text-2xl font-bold text-white mt-1">{Math.floor(Math.random() * 1000)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapper title="Primary Analysis" minHeight="300px">
          <div className="flex items-center justify-center h-full text-slate-500">
            Interactive visualization rendering...
          </div>
        </ChartWrapper>
        <ChartWrapper title="Secondary Trends" minHeight="300px">
          <div className="flex items-center justify-center h-full text-slate-500">
            Data insights processing...
          </div>
        </ChartWrapper>
      </div>
      
      <ChartWrapper title="Detailed Records" minHeight="400px">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E2D45] text-slate-400">
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Value</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[#1E2D45]/50 hover:bg-[#1C2537]/30 transition-colors text-slate-300">
                  <td className="py-3 px-4">ITEM-{Math.floor(Math.random() * 9000) + 1000}</td>
                  <td className="py-3 px-4"><Badge variant={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][i%4]}>Status</Badge></td>
                  <td className="py-3 px-4">₹{(Math.random() * 100).toFixed(2)}Cr</td>
                  <td className="py-3 px-4 text-[#3B8EE8] cursor-pointer hover:underline">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartWrapper>
    </div>
  );
}
