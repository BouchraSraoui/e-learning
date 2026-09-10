import { CircleAlert } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7">
      <Logo size="lg" className="mb-8" />
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
      <CircleAlert size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
