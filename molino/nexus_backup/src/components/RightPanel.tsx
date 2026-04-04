"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, Briefcase, TrendingUp } from "lucide-react";

export function RightPanel() {
  return (
    <div className="space-y-6">
      {/* AI Research Pulse - Chart */}
      <div className="corner-card bg-primary/[0.02]">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-primary">AI Research Pulse</h4>
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#00E5FF] animate-pulse" />
        </div>
        <p className="text-[9px] font-mono-tech text-muted-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-primary" /> TRENDING: Mechanical Fatigue & GaN
        </p>
        
        <div className="flex items-end justify-between h-32 gap-2 mb-4 px-2">
          {[40, 65, 100, 55, 35].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-primary/20 border-t border-primary/50 transition-all duration-1000 relative group"
                style={{ height: `${h}%` }}
              >
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[8px] font-mono-tech text-muted-foreground uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-primary/10 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground font-mono-tech uppercase">Primary Vector</span>
            <span className="text-[9px] font-display text-primary">Thermodynamics</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground font-mono-tech uppercase">Growth Rate</span>
            <span className="text-[9px] font-display text-emerald-400">+15.4%</span>
          </div>
        </div>
      </div>

      {/* Code Frequency Analysis */}
      <div className="corner-card corner-card-bottom-left bg-primary/[0.02]">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-3 h-3 text-primary" />
          <h4 className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-primary">Code Frequency Analysis</h4>
        </div>
        <div className="space-y-6 mb-8">
          {[
            { label: "ASME B31.3", val: 85, status: "High Activity", color: "bg-primary" },
            { label: "API 650", val: 40, status: "Moderate", color: "bg-accent" },
            { label: "ISO 9001", val: 15, status: "Stable", color: "bg-white/10" },
          ].map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between items-center text-[9px] font-mono-tech">
                <span className="text-muted-foreground uppercase tracking-wider">{item.label}</span>
                <span className={cn(item.status === "High Activity" ? "text-primary" : "text-muted-foreground")}>{item.status}</span>
              </div>
              <div className="h-1 w-full bg-primary/5 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", item.color)} 
                  style={{ width: `${item.val}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full h-9 border-primary/20 text-primary hover:bg-primary/10 text-[9px] font-display font-bold uppercase tracking-widest rounded-none">
          View Technical Report
        </Button>
      </div>

      {/* Recruiting Card - Jobs & Ventures */}
      <div className="corner-card border-emerald-500/20 bg-emerald-500/5 group cursor-pointer hover:border-emerald-500/40 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div className="bg-emerald-500/20 text-emerald-400 text-[8px] font-display font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest">
            Recruiting
          </div>
          <Briefcase className="w-3 h-3 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="text-xs font-display font-bold mb-1 text-emerald-100">Senior CFD Engineer Needed</h3>
        <p className="text-[9px] text-muted-foreground font-mono-tech uppercase">Tesla Inc. • Palo Alto, CA</p>
        <div className="mt-4 flex items-center justify-between text-[8px] font-mono-tech text-emerald-500/70">
          <span>COMP: $180K - $240K</span>
          <span className="underline group-hover:text-emerald-400 transition-colors">APPLY_REQ_401</span>
        </div>
      </div>
    </div>
  );
}
