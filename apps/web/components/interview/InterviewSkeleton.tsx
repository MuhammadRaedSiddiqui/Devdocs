export function InterviewSkeleton() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header skeleton */}
      <header className="h-[52px] border-b border-vellum-border bg-vellum flex items-center px-4 md:px-7 gap-2.5 flex-shrink-0">
        <span className="font-serif-heading text-[17px] text-ink">DevDocs AI</span>
        <div className="w-24 h-4 bg-vellum-border-light animate-pulse rounded" />
        <div className="ml-auto flex items-center gap-2">
          <div className="w-16 h-5 bg-vellum-border-light animate-pulse rounded-full" />
        </div>
      </header>

      {/* Three-panel skeleton */}
      <div className="flex flex-row h-[calc(100vh-52px)] overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-r border-vellum-border bg-vellum flex flex-col overflow-hidden hidden md:flex">
          <div className="px-4 pt-3.5 pb-2">
            <div className="w-16 h-3 bg-vellum-border-light animate-pulse rounded" />
          </div>
          <div className="h-1 bg-vellum-border rounded-full mx-4 mb-2.5" />
          <div className="flex-1 px-4 flex flex-col gap-2.5 pt-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="h-4 bg-vellum-border-light animate-pulse rounded"
                style={{ width: i % 2 === 0 ? "70%" : "85%" }}
              />
            ))}
          </div>
        </aside>

        {/* Center chat area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Context bar placeholder */}
          <div className="px-5 py-2.5 border-b border-vellum-border bg-vellum flex items-center gap-2 flex-shrink-0">
            <div className="w-12 h-4 bg-vellum-border-light animate-pulse rounded" />
            <div className="w-20 h-5 bg-vellum-border-light animate-pulse rounded-md" />
            <div className="w-14 h-5 bg-vellum-border-light animate-pulse rounded-md" />
            <div className="w-16 h-5 bg-vellum-border-light animate-pulse rounded-md" />
          </div>

          {/* Chat bubble skeletons */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-3">
            {/* Assistant bubble - narrow */}
            <div className="flex gap-2.5 items-start">
              <div className="w-[26px] h-[26px] rounded-full bg-vellum-border-light animate-pulse flex-shrink-0" />
              <div className="w-[45%] h-16 bg-vellum-border-light animate-pulse rounded-vellum" />
            </div>
            {/* Assistant bubble - wide */}
            <div className="flex gap-2.5 items-start">
              <div className="w-[26px] h-[26px] rounded-full bg-vellum-border-light animate-pulse flex-shrink-0" />
              <div className="w-[70%] h-24 bg-vellum-border-light animate-pulse rounded-vellum" />
            </div>
            {/* User bubble - narrow */}
            <div className="flex gap-2.5 items-start flex-row-reverse">
              <div className="w-[26px] h-[26px] rounded-full bg-vellum-border-light animate-pulse flex-shrink-0" />
              <div className="w-[35%] h-12 bg-vellum-border-light animate-pulse rounded-vellum" />
            </div>
          </div>

          {/* Input placeholder */}
          <div className="border-t border-vellum-border px-5 py-3.5 flex gap-2 items-end flex-shrink-0 bg-white">
            <div className="flex-1 h-[42px] bg-vellum-border-light animate-pulse rounded-vellum" />
            <div className="w-16 h-[42px] bg-vellum-border-light animate-pulse rounded-vellum" />
          </div>
        </div>
      </div>
    </div>
  );
}
