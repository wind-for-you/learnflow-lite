import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/** 外观与 Button 一致的链接：单一 <a> 元素，最小触控高度 44px。 */
export function LinkButton({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 text-sm font-medium',
        'bg-primary-600 text-white transition-colors hover:bg-primary-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className
      )}
      {...props}
    />
  );
}
