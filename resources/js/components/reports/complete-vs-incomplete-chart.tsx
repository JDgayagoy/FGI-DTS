import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartDataPoint } from '@/pages/reports/types';

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
    completed: {
        label: "Completed",
        color: "#93c5fd",
    },
    incomplete: {
        label: "Incomplete",
        color: "#1d4ed8",
    },
} satisfies ChartConfig

export function CompleteVsIncompleteChart({ data }: { data: ChartDataPoint[] }) {
    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Complete vs Incomplete Shipments</p>

            <ChartContainer config={chartConfig} className="w-full h-[220px]">
                <BarChart accessibilityLayer data={data} margin={{ left: -20, right: -5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                        tick={{ fontSize: 11 }}
                        className="fill-slate-500"
                    />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-slate-500" />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                    <Bar dataKey="incomplete" fill="var(--color-incomplete)" radius={4} />
                </BarChart>
            </ChartContainer>

            <div className="flex w-full items-start gap-2 text-xs mt-10">
                <div className="grid gap-2">
                    <div className="flex items-center gap-2 leading-none font-bold text-green-500 uppercase tracking-wider">
                        Trending up by 5.2% this month <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-2 leading-none text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        Last 6 Months
                    </div>
                </div>
            </div>
        </div>
    );
}