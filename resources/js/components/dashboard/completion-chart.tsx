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
  ChartTooltipContent
  
} from "@/components/ui/chart"
import type {ChartConfig} from "@/components/ui/chart";

export const description = "An interactive line chart for completion rate"

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

export function CompletionChart({ chartData = [] }: { chartData?: { date: string; completed: number; total: number }[] }) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("completed")

  const total = React.useMemo(
    () => ({
      completed: chartData.reduce((acc, curr) => acc + curr.completed, 0),
      total: chartData.reduce((acc, curr) => acc + curr.total, 0),
    }),
    [chartData]
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
