type ArticleTagsProps = {
  tags: string[];
  className?: string;
  /** Στη λίστα άρθρων — μόνο pills, χωρίς τίτλο «Ετικέτες». */
  showLabel?: boolean;
  /** Σελίδα άρθρου — minimal pills, χωρίς rounded «κουμπιά». */
  variant?: "default" | "editorial";
};

/** Ετικέτες άρθρου — εμφανίζονται κάτω από το κείμενο. */
export default function ArticleTags({
  tags,
  className,
  showLabel = true,
  variant = "default",
}: ArticleTagsProps) {
  if (!tags.length) return null;

  const editorial = variant === "editorial";

  return (
    <div className={className}>
      {showLabel && !editorial ? (
        <p className="mb-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C2B76]">
          Ετικέτες
        </p>
      ) : null}
      {showLabel && editorial ? (
        <p className="mb-4 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-[#1C1D62]/45">
          Ετικέτες
        </p>
      ) : null}
      <ul className="flex list-none flex-wrap gap-x-3 gap-y-2 p-0 m-0">
        {tags.map((tag) => (
          <li key={tag}>
            {editorial ? (
              <span className="font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7C2B76]">
                {tag}
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-[#1C1D62]/12 bg-[#F0EDF8] px-3 py-1.5 font-body text-xs font-medium text-[#13143E]">
                {tag}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
