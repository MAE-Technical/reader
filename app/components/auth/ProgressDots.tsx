export default function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full border ${
            i === active ? "border-brand-500 bg-brand-500" : "border-sand-300 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
