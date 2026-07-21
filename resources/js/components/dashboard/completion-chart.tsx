"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "An interactive line chart for completion rate"

const chartData = [
  { date: "2024-04-01", completed: 222, total: 350 },
  { date: "2024-04-02", completed: 97, total: 300 },
  { date: "2024-04-03", completed: 167, total: 250 },
  { date: "2024-04-04", completed: 242, total: 400 },
  { date: "2024-04-05", completed: 373, total: 500 },
  { date: "2024-04-06", completed: 301, total: 450 },
  { date: "2024-04-07", completed: 245, total: 380 },
  { date: "2024-04-08", completed: 409, total: 520 },
  { date: "2024-04-09", completed: 59, total: 200 },
  { date: "2024-04-10", completed: 261, total: 350 },
  { date: "2024-04-11", completed: 327, total: 450 },
  { date: "2024-04-12", completed: 292, total: 400 },
  { date: "2024-04-13", completed: 342, total: 500 },
  { date: "2024-04-14", completed: 137, total: 300 },
  { date: "2024-04-15", completed: 120, total: 250 },
  { date: "2024-04-16", completed: 138, total: 280 },
  { date: "2024-04-17", completed: 446, total: 600 },
  { date: "2024-04-18", completed: 364, total: 550 },
  { date: "2024-04-19", completed: 243, total: 400 },
  { date: "2024-04-20", completed: 89, total: 250 },
  { date: "2024-04-21", completed: 137, total: 300 },
  { date: "2024-04-22", completed: 224, total: 350 },
  { date: "2024-04-23", completed: 138, total: 300 },
  { date: "2024-04-24", completed: 387, total: 500 },
  { date: "2024-04-25", completed: 215, total: 400 },
  { date: "2024-04-26", completed: 75, total: 200 },
  { date: "2024-04-27", completed: 383, total: 550 },
  { date: "2024-04-28", completed: 122, total: 300 },
  { date: "2024-04-29", completed: 315, total: 450 },
  { date: "2024-04-30", completed: 454, total: 600 },
]

const chartConfig = {
  views: {
    label: "Shipments",
  },
  completed: {
    label: "Completed",
    color: "var(--chart-1)",
  },
  total: {
    label: "Total Tasks",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function CompletionChart() {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("completed")

  const total = React.useMemo(
    () => ({
      completed: chartData.reduce((acc, curr) => acc + curr.completed, 0),
      total: chartData.reduce((acc, curr) => acc + curr.total, 0),
    }),
    []
  )

  const [isClient, setIsClient] = React.useState(false)
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <Card className="flex flex-col h-[300px] animate-pulse bg-slate-50 dark:bg-slate-900/20" />
    )
  }

  return (
    <Card className="py-4 sm:py-0 bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col items-stretch border-b border-slate-100 dark:border-slate-800 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:py-0">
          <CardTitle className="text-[12px] font-bold">Completion Rate</CardTitle>
          <CardDescription className="text-[10px]">
            Trends for the last 30 days
          </CardDescription>
        </div>
        <div className="flex">
          {["completed", "total"].map((key) => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="flex flex-1 flex-col justify-center gap-1 border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-left even:border-l data-[active=true]:bg-slate-50 dark:data-[active=true]:bg-slate-800/40 sm:border-t-0 sm:border-l sm:px-6 sm:py-4 transition-colors"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-black sm:text-2xl tracking-tighter">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[180px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
              className="text-[10px] font-medium fill-slate-400"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px] border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2.5}
              dot={false}
              animationDuration={1500}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
