"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "Accuracy Rate Donut"

const chartConfig = {
  count: {
    label: "Documents",
  },
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  uploaded: {
    label: "Uploaded",
    color: "var(--chart-2)",
  },
  invalid: {
    label: "Invalid",
    color: "var(--chart-3)",
  },
  missing: {
    label: "Missing",
    color: "var(--chart-4)",
  },
  archived: {
    label: "Archived",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

interface AccuracyChartProps {
  data: {
    active: number;
    uploaded: number;
    invalid: number;
    missing: number;
    archived: number;
  }
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const chartData = [
    { type: "active", count: data.active, fill: "var(--color-active)" },
    { type: "uploaded", count: data.uploaded, fill: "var(--color-uploaded)" },
    { type: "invalid", count: data.invalid, fill: "var(--color-invalid)" },
    { type: "missing", count: data.missing, fill: "var(--color-missing)" },
    { type: "archived", count: data.archived, fill: "var(--color-archived)" },
  ]

  const totalDocuments = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0)
  }, [data])

  // Calculate accuracy rate (active / total)
  const accuracyRate = totalDocuments > 0 ? Math.round((data.active / totalDocuments) * 100) : 0;

  if (!isClient) {
    return (
      <div className="flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-800" />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[280px] h-[280px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="type"
            innerRadius={80}
            strokeWidth={10}
            cornerRadius={6}
            paddingAngle={2}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-4xl font-black tracking-tighter"
                      >
                        {accuracyRate}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-xs font-bold uppercase tracking-widest"
                      >
                        Accuracy
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="-mt-1 flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-wider">
        <TrendingUp className="size-3" /> 5.2% increase
      </div>
    </div>
  )
}
