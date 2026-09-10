import { BrandPanel } from '@/components/auth/brand-panel';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <BrandPanel />

      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
