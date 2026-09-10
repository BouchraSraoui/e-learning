import { cn, initials } from '@/lib/utils';

const SIZES = {
  sm: 'h-8 w-8 text-xs rounded-lg',
  md: 'h-10 w-10 text-sm rounded-xl',
  lg: 'h-14 w-14 text-lg rounded-2xl',
  xl: 'h-24 w-24 text-3xl rounded-3xl',
} as const;

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className={cn('object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid place-items-center bg-brand-gradient font-bold text-white',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
