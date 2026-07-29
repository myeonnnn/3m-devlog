import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'signal' | 'line' | 'danger' | 'ghost';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  signal: 'border-signal text-signal',
  line: 'border-line text-text hover:border-signal hover:text-signal',
  danger: 'border-danger text-danger',
  ghost: 'border-line text-dim hover:text-text',
};

export const buttonClass = (variant: ButtonVariant = 'line', className = '') =>
  `flex h-11 items-center justify-center border px-4 text-sm disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`.trim();

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'line', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
