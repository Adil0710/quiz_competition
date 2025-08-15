"use client";

import { useState, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { convertFormatToDateFns } from "@/lib/data";

interface DateTimePickerProps {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  type: "date" | "time" | "datetime";
  dateFormat?: string;
  value: {
    date?: Date | undefined;
    hour?: string;
    minute?: string;
    period?: "AM" | "PM";
  };
  onChange: (value: any) => void;
  required?: boolean;
  error?: string;
  futureDate?: boolean;
  pastDate?: boolean;
  smallScreen?: boolean;
}

export function DateTimePicker({
  id,
  label,
  description,
  placeholder = "Select date",
  type = "date",
  dateFormat = "MM-dd-yyyy",
  value = {},
  onChange,
  required,
  error,
  futureDate = true,
  pastDate = false,
  smallScreen = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    value?.date?.getMonth() || new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    value?.date?.getFullYear() || new Date().getFullYear()
  );
  const isMobile = useIsMobile();
  const formattedDateFormat = convertFormatToDateFns(dateFormat);
  const [validationState, setValidationState] = useState({
    dateSelected: !!value?.date,
    timeComplete: !!(value?.hour && value?.minute && value?.period)
  });

  // Update month/year when date changes
  useEffect(() => {
    if (value?.date) {
      setSelectedMonth(value.date.getMonth());
      setSelectedYear(value.date.getFullYear());
      setValidationState(prev => ({...prev, dateSelected: true}));
    } else {
      setValidationState(prev => ({...prev, dateSelected: false}));
    }
    
    // Check if time is complete
    const timeComplete = !!(value?.hour && value?.minute && value?.period);
    setValidationState(prev => ({...prev, timeComplete}));
  }, [value]);

  const handleDateChange = (date: Date | undefined) => {
    // Ensure value is an object
    const currentValue = value || {};
    onChange({ ...currentValue, date });
  };

  const handleTimeChange = (
    field: "hour" | "minute" | "period",
    fieldValue: string
  ) => {
    // Ensure value is an object
    const currentValue = value || {};
    onChange({ ...currentValue, [field]: fieldValue });
  };

  // Helper function to safely check the type
  const isDateType = type === "date" || type === "datetime";
  const isTimeType = type === "time" || type === "datetime";

  // Get today's date with time set to midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine if we show validation errors
  const showDateError = required && !validationState.dateSelected && (type === "date" || type === "datetime");
  const showTimeError = required && !validationState.timeComplete && (type === "time" || type === "datetime");
  const showError = error || (required && (showDateError || showTimeError));

  // Generate appropriate error message
  const errorMessage = error || (
    type === "datetime" ? 
      `Both date and time are required for ${label}` : 
      type === "date" ? 
        `Date is required ${label}` : 
        `Complete time (hour, minute, and AM/PM) is required for ${label}`
  );

  // Safe getter for value properties with defaults
  const getValueOrDefault = () => {
    // If no value provided, return empty defaults
    if (!value) return { date: undefined, hour: undefined, minute: undefined, period: undefined };
    // Handle null values in any of the fields
    return {
      date: value.date || undefined,
      hour: value.hour || undefined,
      minute: value.minute || undefined,
      period: value.period || undefined
    };
  };

  const safeValue = getValueOrDefault();

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={id} className={cn(smallScreen && "text-xs")}>
          {label || "Date/Time"}
          {required && <span className="text-destructive ml-1">*</span>}
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </Label>
      </div>
      <div className="flex flex-row w-full justify-between gap-4">
        {/* Date Picker */}
        {isDateType ? (
          <div className="grid gap-2 w-full">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={`${id}-date`}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !safeValue.date && "text-muted-foreground",
                    showError ? "border-destructive" : "",
                    smallScreen && "text-xs h-6"
                  )}
                >
                  <CalendarIcon
                    className={cn(smallScreen && "h-2 w-2", "mr-2 h-4 w-4")}
                  />
                  {(() => {
                    if (type === "datetime" && safeValue.date && safeValue.hour && safeValue.minute && safeValue.period) {
                      return `${formatDate(safeValue.date, formattedDateFormat)} ${safeValue.hour}:${safeValue.minute} ${safeValue.period}`;
                    } else if (isTimeType && safeValue.hour && safeValue.minute && safeValue.period) {
                      return `${safeValue.hour}:${safeValue.minute} ${safeValue.period}`;
                    } else if (safeValue.date) {
                      return formatDate(safeValue.date, formattedDateFormat);
                    } else {
                      return placeholder;
                    }
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn("w-auto p-0")} align="start">
                <div className="flex">
                  <div className="flex flex-col items-center justify-between gap-5">
                    <div className="flex flex-row items-center w-full justify-between px-4 pt-4 gap-5">
                      <Select
                        value={selectedMonth.toString()}
                        onValueChange={(month) =>
                          setSelectedMonth(Number.parseInt(month))
                        }
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {formatDate(new Date(2021, i), "MMMM")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(year) =>
                          setSelectedYear(Number.parseInt(year))
                        }
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 101 }, (_, i) => 2030 - i).map(
                            (year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Calendar
                      mode="single"
                      className="pt-0"
                      selected={safeValue.date}
                      onSelect={(date) => {
                        handleDateChange(date);
                        if (type === "date") setOpen(false);
                      }}
                      disabled={(date) => {
                        // Disallow dates before 1900
                        if (date < new Date("1900-01-01")) return true;

                        // Handle future date restriction (futureDate=false means disallow future dates)
                        if (futureDate === false && date > today) return true;

                        // Handle past date restriction (pastDate=false means disallow past dates)
                        if (pastDate === false && date < today) return true;

                        return false;
                      }}
                      initialFocus
                      month={new Date(selectedYear, selectedMonth)}
                      onMonthChange={(date) => {
                        setSelectedYear(date.getFullYear());
                        setSelectedMonth(date.getMonth());
                      }}
                    />
                  </div>

                  {type === "datetime" ? (
                    <div className="flex flex-col sm:flex-row sm:h-[355px] pt-4 divide-y sm:divide-y-0 sm:divide-x">
                      <ScrollArea className="overflow-auto">
                        <div className="w-64 sm:w-auto">
                          <div className="flex sm:flex-col p-2">
                            {Array.from({ length: 12 }, (_, i) => i + 1)
                              .reverse()
                              .map((hour) => (
                                <Button
                                  key={hour}
                                  size="icon"
                                  variant={
                                    safeValue.hour === hour.toString()
                                      ? "default"
                                      : "ghost"
                                  }
                                  className="sm:w-full shrink-0 aspect-square"
                                  onClick={() =>
                                    handleTimeChange("hour", hour.toString())
                                  }
                                >
                                  {hour}
                                </Button>
                              ))}
                          </div>
                        </div>
                        <ScrollBar
                          orientation={`${
                            isMobile ? "horizontal" : "vertical"
                          }`}
                        />
                      </ScrollArea>
                      <ScrollArea className="overflow-auto">
                        <div className="w-64 sm:w-auto">
                          <div className="flex sm:flex-col p-2">
                            {Array.from({ length: 60 }, (_, i) => i * 1).map(
                              (minute) => (
                                <Button
                                  key={minute}
                                  size="icon"
                                  variant={
                                    safeValue.minute ===
                                    minute.toString().padStart(2, "0")
                                      ? "default"
                                      : "ghost"
                                  }
                                  className="sm:w-full shrink-0 aspect-square"
                                  onClick={() =>
                                    handleTimeChange(
                                      "minute",
                                      minute.toString().padStart(2, "0")
                                    )
                                  }
                                >
                                  {minute.toString().padStart(2, "0")}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                        <ScrollBar
                          orientation={`${
                            isMobile ? "horizontal" : "vertical"
                          }`}
                        />
                      </ScrollArea>
                      <ScrollArea className="overflow-auto">
                        <div className="flex sm:flex-col p-2">
                          {["AM", "PM"].map((period) => (
                            <Button
                              key={period}
                              size="icon"
                              variant={
                                safeValue.period === period ? "default" : "ghost"
                              }
                              className="sm:w-full shrink-0 aspect-square"
                              onClick={() =>
                                handleTimeChange(
                                  "period",
                                  period as "AM" | "PM"
                                )
                              }
                            >
                              {period}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}

        {type === "time" ? (
          <div className="flex flex-row gap-2 w-full">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={`${id}-time`}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    (!safeValue.hour || !safeValue.minute || !safeValue.period) &&
                      "text-muted-foreground",
                    showError ? "border-destructive" : "",
                    smallScreen && "text-xs h-6"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {safeValue.hour && safeValue.minute && safeValue.period
                    ? `${safeValue.hour}:${safeValue.minute} ${safeValue.period}`
                    : "Select time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-row h-[300px] divide-y-0 divide-x">
                  <ScrollArea className="overflow-auto">
                    <div className="w-14 sm:w-auto">
                      <div className="flex flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1)
                          .reverse()
                          .map((hour) => (
                            <Button
                              key={hour}
                              size="icon"
                              variant={
                                safeValue.hour === hour.toString()
                                  ? "default"
                                  : "ghost"
                              }
                              className={cn("sm:w-full shrink-0 aspect-square")}
                              onClick={() =>
                                handleTimeChange("hour", hour.toString())
                              }
                            >
                              {hour}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </ScrollArea>
                  <ScrollArea className="overflow-auto">
                    <div className="w-14 sm:w-auto">
                      <div className="flex flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                          (minute) => (
                            <Button
                              key={minute}
                              size="icon"
                              variant={
                                safeValue.minute ===
                                minute.toString().padStart(2, "0")
                                  ? "default"
                                  : "ghost"
                              }
                              className="sm:w-full shrink-0 aspect-square"
                              onClick={() =>
                                handleTimeChange(
                                  "minute",
                                  minute.toString().padStart(2, "0")
                                )
                              }
                            >
                              {minute.toString().padStart(2, "0")}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="overflow-auto">
                    <div className="flex flex-col p-2">
                      {["AM", "PM"].map((period) => (
                        <Button
                          key={period}
                          size="icon"
                          variant={
                            safeValue.period === period ? "default" : "ghost"
                          }
                          className="sm:w-full shrink-0 aspect-square"
                          onClick={() =>
                            handleTimeChange("period", period as "AM" | "PM")
                          }
                        >
                          {period}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
      {showError && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
