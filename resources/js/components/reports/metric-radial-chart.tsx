import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import * as React from "react"

interface Props {
  chartData: any[];
  chartConfig: ChartConfig;
  totalValue: number;
  totalLabel: string;
  dataKeys: string[];
}

export function MetricRadialChart({ chartData, chartConfig, totalValue, totalLabel, dataKeys }: Props) {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-800" />
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square w-full max-w-[200px]"
    >
      <RadialBarChart
        data={chartData}
        endAngle={180}
        innerRadius={70}
        outerRadius={100}
      >
        {dataKeys.map((key) => (
          <RadialBar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            stackId="a"
            cornerRadius={5}
            className="stroke-transparent stroke-2"
          />
        ))}
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 16}
                      className="fill-foreground text-3xl font-black tracking-tighter"
                    >
                      {totalValue.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 4}
                      className="fill-muted-foreground text-[10px] font-bold uppercase tracking-widest"
                    >
                      {totalLabel}
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}
