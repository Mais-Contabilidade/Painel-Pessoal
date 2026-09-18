import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const base =
  "w-full rounded-lg border border-border bg-surface px-3 text-[15px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-accent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`h-10 ${base} ${className}`} {...props} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return <textarea ref={ref} className={`py-2.5 resize-none ${base} ${className}`} {...props} />;
});

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-medium text-text-muted">{children}</label>;
}
