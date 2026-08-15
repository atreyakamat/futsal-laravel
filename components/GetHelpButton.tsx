'use client';

import { openSupportTicket } from '@/components/SupportWidget';

interface GetHelpButtonProps {
  subject: string;
  description?: string;
  className?: string;
  label?: string;
}

export default function GetHelpButton({ subject, description, className, label }: GetHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openSupportTicket({ subject, description })}
      className={className || 'btn-secondary !py-3 !px-6 !rounded-full !text-[10px] flex items-center gap-2'}
    >
      <span className="material-symbols-outlined text-lg">support_agent</span>
      {label || 'GET HELP'}
    </button>
  );
}
