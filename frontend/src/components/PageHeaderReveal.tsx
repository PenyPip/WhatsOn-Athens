import { cn } from "@/lib/utils";

/** Αντικατάσταση framer-motion σε headers λίστας — CSS μόνο. */
export default function PageHeaderReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("animate-fade-in-up", className)}>{children}</div>;
}
