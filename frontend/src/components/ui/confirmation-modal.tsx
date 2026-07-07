'use client';
import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111827] border border-[#1E2D45] p-6 rounded-xl shadow-2xl z-50 w-full max-w-md animate-in zoom-in-95">
          <AlertDialog.Title className="text-xl font-bold text-white mb-2">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-slate-400 mb-6">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="px-4 py-2 rounded-lg border border-[#1E2D45] text-slate-300 hover:bg-[#1C2537] transition-colors">
                {cancelText}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button 
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDestructive 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                    : 'bg-[#3B8EE8] text-white hover:bg-[#2563EB]'
                }`}
              >
                {confirmText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
