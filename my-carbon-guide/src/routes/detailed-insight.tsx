import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ecolog/AppShell";
import { ArrowLeft, Sparkles, TrendingDown, Target, Zap, Leaf, Send, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DetailedInsight() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [insightData, setInsightData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const state = location.state;

  useEffect(() => {
    if (!state || !user) {
      setError("Missing context to generate insight.");
      setLoading(false);
      return;
    }

    const generateInsight = async () => {
      try {
        const payload = {
          userId: user.uid,
          userName: state.userName,
          city: state.city,
          todayKg: state.todayKg,
          weeklyAvg: state.weeklyAvg,
          cityAvg: state.cityAvg,
          topActivity: state.topActivity,
          streak: state.streak,
          language,
        };

        const res = await fetch("http://localhost:8000/api/insights/detailed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errorDetail = "Failed to generate insight";
          try {
            const errorData = await res.json();
            errorDetail = errorData.detail || errorDetail;
          } catch (e) {}
          throw new Error(errorDetail);
        }

        const data = await res.json();
        setInsightData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    generateInsight();
  }, [state, user]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const newMessage = { role: "user", text: chatInput.trim() };
    const updatedHistory = [...chatMessages, newMessage];
    
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const payload = {
        userId: user!.uid,
        message: newMessage.text,
        history: chatMessages,
        context: insightData,
        language,
      };

      const res = await fetch("http://localhost:8000/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      setChatMessages([...updatedHistory, { role: "model", text: data.reply }]);
    } catch (err) {
      console.error(err);
      // Optional: show error toast here
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <AppShell hideNavbar>
      {/* Top Bar */}
      <div className="flex items-center gap-3 pt-2 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          {t("detailedInsight.title")} <Sparkles size={16} className="text-primary animate-pulse" />
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-muted rounded-2xl w-full" />
          <div className="h-24 bg-muted rounded-2xl w-full" />
          <div className="h-40 bg-muted rounded-2xl w-full" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center text-destructive">
          <p className="font-semibold">{t("detailedInsight.errorTitle")}</p>
          <p className="text-xs mt-1">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
          >
            {t("detailedInsight.goBack")}
          </button>
        </div>
      ) : insightData ? (
        <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
          {/* AI Chat Interface */}
          <section className="flex-1 flex flex-col rounded-2xl border border-primary/20 bg-card p-4 shadow-[var(--shadow-card)] min-h-0">
            <h2 className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1">
              <MessageSquare size={12} /> {t("detailedInsight.askEcoLogAI")}
            </h2>
            
            <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-muted">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-center gap-3 px-4">
                  <div className="text-4xl">🌿</div>
                  <p className="text-sm font-semibold text-foreground">{t("detailedInsight.chatPlaceholder")}</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    {t("detailedInsight.chatSubtext")}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {[
                      t("detailedInsight.q1"),
                      t("detailedInsight.q2"),
                      t("detailedInsight.q3"),
                    ].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} className="text-[10px] border border-primary/30 rounded-full px-3 py-1 text-primary hover:bg-primary/10 transition-colors">{q}</button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="text-xs px-3 py-2 rounded-2xl bg-muted text-muted-foreground rounded-tl-sm flex items-center gap-1">
                    <span className="animate-bounce inline-block">●</span>
                    <span className="animate-bounce inline-block delay-75">●</span>
                    <span className="animate-bounce inline-block delay-150">●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="shrink-0 flex gap-2">
              <input
                type="text"
                placeholder={t("detailedInsight.inputPlaceholder")}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
              >
                <Send size={14} />
              </button>
            </form>
          </section>


        </div>
      ) : null}
    </AppShell>
  );
}
