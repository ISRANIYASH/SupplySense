import React from 'react';

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon?: any, 
  title: string, 
  description?: string, 
  action?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-[#1E2D45] rounded-xl bg-[#0A0F1E]/50">
      {Icon && <div className="p-3 bg-[#1C2537] rounded-full mb-4"><Icon className="w-8 h-8 text-slate-400" /></div>}
      <h3 className="text-lg font-medium text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-slate-400 mb-6 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
