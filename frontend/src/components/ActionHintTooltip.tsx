import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ActionHintTooltipProps = {
  label: string;
  children: ReactNode;
  /** Σκούρο hero — ανοιχτό tooltip. */
  dark?: boolean;
  side?: "top" | "bottom" | "left" | "right";
};

/** Ελαφρύ hover hint για εικονίδια (καρδιά / μάτι) — χωρίς extra bundle στο critical path πέρα από Radix Tooltip. */
export default function ActionHintTooltip({
  label,
  children,
  dark = false,
  side = "bottom",
}: ActionHintTooltipProps) {
  return (
    <TooltipProvider delayDuration={280} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn(
            "max-w-[16rem] text-center text-xs font-medium leading-snug",
            dark
              ? "border-white/25 bg-[#1a1b4a] text-[#F0EDF8] shadow-lg"
              : "border-border bg-white text-[#13143E]",
          )}
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
