export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-xs text-center space-y-3">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      <div className="pt-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-[#077EA1]">
          Ready for Phase 3/4 integration
        </span>
      </div>
    </div>
  );
}

