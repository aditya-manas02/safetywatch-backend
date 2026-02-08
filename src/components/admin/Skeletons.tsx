export const PremiumSkeleton = ({ className }: { className?: string }) => (
    <div className={`relative overflow-hidden bg-slate-900/50 rounded-xl ${className}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <style>{`
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
    `}</style>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <PremiumSkeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PremiumSkeleton className="h-[400px]" />
            <PremiumSkeleton className="h-[400px]" />
        </div>
    </div>
);

export const TableSkeleton = () => (
    <div className="bg-[#071328] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 bg-[#0b1220] border-b border-gray-800">
            <PremiumSkeleton className="h-6 w-1/4" />
        </div>
        <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4">
                    <PremiumSkeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <PremiumSkeleton className="h-4 w-1/3" />
                        <PremiumSkeleton className="h-3 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);
