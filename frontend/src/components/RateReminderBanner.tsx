import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type RateReminderBannerProps = {
  title: string;
  onRateClick?: () => void;
  className?: string;
};

/** Υπενθύμιση βαθμολόγησης για περιεχόμενο που έχει σημειωθεί ως «το είδα» χωρίς κριτική. */
export default function RateReminderBanner({ title, onRateClick, className = "" }: RateReminderBannerProps) {
  const scrollToReview = () => {
    if (onRateClick) {
      onRateClick();
      return;
    }
    const el = document.getElementById("write-review");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-amber-700">
          <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
        </span>
        <div>
          <p className="font-medium text-[#13143E]">Το είδες — βαθμολόγησέ το</p>
          <p className="mt-0.5 text-sm text-[#13143E]/75">
            Η γνώμη σου για «{title}» βοηθά και άλλους θεατές.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 bg-[#13143E] font-semibold text-white hover:bg-[#1C1D62]"
        onClick={scrollToReview}
      >
        Γράψε βαθμολογία
      </Button>
    </div>
  );
}
