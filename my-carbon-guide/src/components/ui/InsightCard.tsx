import { Sparkles, RefreshCw } from "lucide-react";

interface InsightCardProps {
  insight: string;
  loading: boolean;
  language?: "en" | "kn" | "hi";
  onRefresh?: () => void;
  mini?: boolean; // Show only first sentence
}

export function InsightCard({ insight, loading, onRefresh, mini = false }: InsightCardProps) {
  // If mini mode is enabled, only display the first sentence
  const displayText = useMemo(() => {
    if (!insight) return "";
    if (!mini) return insight;
    const match = insight.match(/[^.!?]+[.!?]+/);
    return match ? match[0] : insight;
  }, [insight, mini]);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.3)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md pulse-border-anim text-white">
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(29,158,117,0.2); }
          50% { border-color: rgba(29,158,117,0.7); }
        }
        .pulse-border-anim {
          animation: pulse-border 2s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 rounded-full bg-[rgba(29,158,117,0.2)] px-2.5 py-0.5 border border-[rgba(29,158,117,0.4)]">
          <Sparkles size={12} className="text-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-glow">
            AI Insight
          </span>
        </div>

        {onRefresh && !loading && (
          <button
            onClick={onRefresh}
            className="rounded-full p-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors duration-200 active:scale-95"
            aria-label="Regenerate insight"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2 py-1 animate-pulse">
          <div className="h-3.5 bg-white/10 rounded w-full"></div>
          <div className="h-3.5 bg-white/10 rounded w-11/12"></div>
          {!mini && <div className="h-3.5 bg-white/10 rounded w-4/5"></div>}
        </div>
      ) : (
        <p className="text-sm font-medium leading-relaxed text-gray-100 select-none">
          {displayText || "AI insight unavailable — check your API key"}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 text-[10px] font-medium text-gray-400 flex items-center justify-end select-none">
        Powered by Gemini ✨
      </div>
    </div>
  );
}

import { useMemo } from "react";
