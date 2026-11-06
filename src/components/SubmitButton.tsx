"use client";
import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, className = "btn small" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
