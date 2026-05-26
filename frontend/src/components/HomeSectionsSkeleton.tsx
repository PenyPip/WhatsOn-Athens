/** Placeholder σειρών καρτών — γρήγορο οπτικό γέμισμα πριν το HomeBody. */
export default function HomeSectionsSkeleton() {
  return (
    <div className="bg-[#F0EDF8] pb-10" aria-hidden="true">
      {[0, 1].map((row) => (
        <div key={row} className="border-b border-[#1C1D62]/10 py-8">
          <div className="container max-w-7xl">
            <div className="mb-5 h-3 w-32 animate-pulse rounded bg-[#1C1D62]/10" />
            <div className="mb-3 h-7 w-56 animate-pulse rounded bg-[#1C1D62]/12" />
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-[18rem] w-[11rem] shrink-0 animate-pulse rounded-lg bg-[#1C1D62]/8 md:h-[20rem] md:w-[13rem]"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
