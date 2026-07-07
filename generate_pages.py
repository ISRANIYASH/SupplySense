import os

base_dir = r"c:\Users\yashi\OneDrive\Desktop\supplysense\apps\web\src\app\(dashboard)"

pages = {
    "forecast": "Demand Forecast",
    "suppliers": "Supplier Hub",
    "logistics": "Logistics Tracker",
    "warehouse": "Warehouse Digital Twin",
    "market": "Market Intelligence",
    "weather": "Weather Intelligence",
    "risk": "Risk Management Center",
    "copilot": "AI Copilot",
    "simulator": "Scenario Simulator",
    "explainability": "Explainable AI",
    "analytics": "Analytics Lab",
    "mlops": "MLOps Center",
    "decisions": "Decision History",
    "alerts": "Alert Center",
    "admin": "Admin Center"
}

template = """'use client';

import React from 'react';
import {{ PageHeader }} from '@/components/ui/page-header';
import {{ ChartWrapper }} from '@/components/ui/chart-wrapper';
import {{ Badge }} from '@/components/ui/badge';

export default function {component_name}Page() {{
  return (
    <div className="space-y-6">
      <PageHeader 
        title="{title}" 
        subtitle="AI-powered insights and analytics" 
        badge={{<Badge variant="HIGH">Active</Badge>}} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {{[1, 2, 3, 4].map((i) => (
          <div key={{i}} className="bg-[#111827] border border-[#1E2D45] rounded-xl p-4 flex flex-col">
            <span className="text-slate-400 text-sm">Metric {{i}}</span>
            <span className="text-2xl font-bold text-white mt-1">{{Math.floor(Math.random() * 1000)}}</span>
          </div>
        ))}}
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
              {{[1, 2, 3, 4, 5].map((i) => (
                <tr key={{i}} className="border-b border-[#1E2D45]/50 hover:bg-[#1C2537]/30 transition-colors text-slate-300">
                  <td className="py-3 px-4">ITEM-{{Math.floor(Math.random() * 9000) + 1000}}</td>
                  <td className="py-3 px-4"><Badge variant={{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][i%4]}}>Status</Badge></td>
                  <td className="py-3 px-4">₹{{(Math.random() * 100).toFixed(2)}}Cr</td>
                  <td className="py-3 px-4 text-[#3B8EE8] cursor-pointer hover:underline">View</td>
                </tr>
              ))}}
            </tbody>
          </table>
        </div>
      </ChartWrapper>
    </div>
  );
}}
"""

for folder, title in pages.items():
    page_dir = os.path.join(base_dir, folder)
    if not os.path.exists(page_dir):
        os.makedirs(page_dir)
    
    file_path = os.path.join(page_dir, "page.tsx")
    component_name = "".join(word.capitalize() for word in folder.split("-"))
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(template.format(component_name=component_name, title=title))

print("Created 15 page scaffolding files.")
