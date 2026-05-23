/** Server-only LCP shell όταν το CMS δεν έχει ενότητα hero — ζωγραφίζεται πριν το SPA hydrate. */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  return (
    <div
      className="relative max-md:-mt-16 max-md:pt-16 md:-mt-28 md:pt-28 h-[min(75vh,520px)] min-h-[380px] overflow-hidden bg-[#111111]"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterHref}
        alt=""
        width={640}
        height={960}
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 768px) 100vw, 800px"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />
      <div className="relative z-10 container flex h-full items-end pb-10 md:pb-14">
        <p className="max-w-2xl font-display text-2xl font-bold leading-tight text-white md:text-4xl">{title}</p>
      </div>
    </div>
  );
}
