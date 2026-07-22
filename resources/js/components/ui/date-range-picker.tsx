"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePickerWithRange({
  className,
  buttonClassName,
  onRangeChange,
  initialFrom = "",
  initialTo = "",
}: React.HTMLAttributes<HTMLDivElement> & { 
  buttonClassName?: string;
  onRangeChange?: (date: DateRange | undefined) => void;
  initialFrom?: string;
  initialTo?: string;
}) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialFrom ? new Date(initialFrom + "T00:00:00") : undefined,
    to: initialTo ? new Date(initialTo + "T00:00:00") : undefined,
  })

  React.useEffect(() => {
    onRangeChange?.(date)
  }, [date, onRangeChange])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 rounded-lg gap-2 px-3 bg-white dark:bg-slate-900/50 hover:border-indigo-400 transition-all shadow-sm focus:ring-2 focus:ring-blue-500 justify-start text-left",
              !date && "text-muted-foreground",
              buttonClassName
            )}
          >
            <CalendarIcon className="size-3.5 text-indigo-500" />
            <div className="flex items-center gap-1 flex-1">
                {date?.from ? (
                  date.to ? (
                    <>
                      <span className="text-slate-900 dark:text-slate-100">{format(date.from, "LLL dd, y")}</span>
                      <span className="text-slate-400 font-normal">-</span>
                      <span className="text-slate-900 dark:text-slate-100">{format(date.to, "LLL dd, y")}</span>
                    </>
                  ) : (
                    <span className="text-slate-900 dark:text-slate-100">{format(date.from, "LLL dd, y")}</span>
                  )
                ) : (
                  <span>Select Range</span>
                )}
            </div>
            <ChevronDown className="size-3 text-slate-400 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
