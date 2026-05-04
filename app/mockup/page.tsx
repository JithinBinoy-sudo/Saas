"use client";

import React, { useState } from "react";
import { Sparkles, TrendingDown, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { 
  ResponsiveContainer, ComposedChart, Line, Tooltip
} from "recharts";

// --- MOCK DATA ---
const chartData = [
  { month: "May", revenue: 4100 },
  { month: "Jun", revenue: 4800 },
  { month: "Jul", revenue: 5200 },
  { month: "Aug", revenue: 5500 },
  { month: "Sep", revenue: 5300 },
  { month: "Oct", revenue: 4900 },
  { month: "Nov", revenue: 5562 },
];

const properties = [
  { id: "A-102", revenue: 1250, risk: "Low" },
  { id: "B-404", revenue: 840, risk: "High" },
  { id: "C-201", revenue: 1500, risk: "Low" },
  { id: "D-305", revenue: 650, risk: "High" },
  { id: "E-108", revenue: 950, risk: "Medium" },
];

export default function MinimalistMockupPage() {
  const [selectedMonth, setSelectedMonth] = useState("November");

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100">
      
      {/* MINIMAL HEADER */}
      <header className="px-8 py-10 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-900 rounded-full" />
          <span className="font-semibold tracking-tight text-sm">Portlio</span>
        </div>
        <nav className="flex items-center gap-8 text-sm font-medium text-zinc-500">
          <span className="text-zinc-900 cursor-pointer">Overview</span>
          <span className="hover:text-zinc-900 cursor-pointer transition-colors">Properties</span>
          <span className="hover:text-zinc-900 cursor-pointer transition-colors">Archive</span>
        </nav>
        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium">
          JA
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="px-8 pb-24 max-w-6xl mx-auto space-y-24">
        
        {/* HERO SECTION */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-12 pt-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-auto p-0 border-none bg-transparent shadow-none focus:ring-0 text-zinc-500 font-medium hover:text-zinc-900 transition-colors w-auto">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="November">November 2026</SelectItem>
                  <SelectItem value="October">October 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-7xl font-light tracking-tighter tabular-nums">$5,562</h1>
              <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                <TrendingDown className="w-4 h-4" />
                <span>51.1% from last month</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Occupancy</span>
              <span className="text-xl font-medium">12.9%</span>
            </div>
            <div className="w-px h-8 bg-zinc-100 mx-4" />
            <div className="flex flex-col">
              <span className="text-zinc-400 text-xs uppercase tracking-widest mb-1">ADR</span>
              <span className="text-xl font-medium">$371</span>
            </div>
          </div>
        </section>

        {/* MINIMAL CHART */}
        <section className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <Tooltip 
                contentStyle={{ backgroundColor: "#18181b", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px" }}
                itemStyle={{ color: "#fff" }}
                formatter={(value: number) => [`$${value}`, undefined]}
                labelStyle={{ display: 'none' }}
                cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#18181b" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4, fill: "#18181b", stroke: "none" }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        {/* PROPERTIES & BRIEFINGS SPLIT */}
        <section className="grid md:grid-cols-2 gap-20">
          
          {/* PROPERTIES */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-medium tracking-tight">At Risk Properties</h2>
              <span className="text-sm text-zinc-500 flex items-center gap-1 cursor-pointer hover:text-zinc-900 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            
            <Table>
              <TableBody>
                {properties.sort((a,b) => a.revenue - b.revenue).map((p) => (
                  <TableRow key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="font-mono text-sm py-4 text-zinc-500 w-24">
                      {p.id}
                    </TableCell>
                    <TableCell className="text-right tabular-nums py-4 font-medium">
                      ${p.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {p.risk === 'High' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                          <Activity className="w-3 h-3" /> Action required
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* AI BRIEFINGS */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-medium tracking-tight">Executive Briefing</h2>
              <Button variant="outline" className="h-8 rounded-full text-xs font-medium border-zinc-200 hover:bg-zinc-50">
                <Sparkles className="w-3 h-3 mr-2" />
                Generate New
              </Button>
            </div>

            <div className="space-y-6">
              <div className="group cursor-pointer">
                <p className="text-sm text-zinc-500 mb-2">Q3 Manhattan Summary</p>
                <p className="text-lg leading-snug font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors">
                  Overall portfolio revenue dropped 51% M/M, driven by a sharp decline in coastal short-term bookings. Urban properties maintained stable occupancy.
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-zinc-400">
                  <span>Oct 1, 2026</span>
                  <span>GPT-4o</span>
                  <span className="flex items-center gap-1 text-emerald-600">
                     Read full report <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
