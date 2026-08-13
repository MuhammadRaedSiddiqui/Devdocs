export default function Loading() {
  return (
    <div className="p-7 space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-vellum-border-light rounded" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 bg-vellum-border-light rounded-vellum" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 bg-vellum-border-light rounded-vellum" />
        ))}
      </div>
    </div>
  );
}
