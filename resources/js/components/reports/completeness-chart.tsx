import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartDataPoint } from '@/pages/reports/types';

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
    documents: {
        label: "Documents",
        color: "#ef4444",
    },
    shipments: {
        label: "Shipments",
        color: "#3b82f6",
    },
} satisfies ChartConfig

export function CompletenessChart({ data }: { data: ChartDataPoint[] }) {
    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Completeness Rate over Time</p>

            <ChartContainer config={chartConfig} className="w-full h-[220px]">
                <AreaChart
                    accessibilityLayer
                    data={data}
                    margin={{
                        left: -5,
                        right: -5,
                    }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11 }}
                        className="fill-slate-500"
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-slate-500" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-slate-500" />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <defs>
                        <linearGradient id="fillDocuments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-documents)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-documents)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillShipments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-shipments)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-shipments)" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <Area
                        yAxisId="left"
                        dataKey="documents"
                        type="natural"
                        fill="url(#fillDocuments)"
                        fillOpacity={0.4}
                        stroke="var(--color-documents)"
                    />
                    <Area
                        yAxisId="right"
                        dataKey="shipments"
                        type="natural"
                        fill="url(#fillShipments)"
                        fillOpacity={0.4}
                        stroke="var(--color-shipments)"
                    />
                </AreaChart>
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