"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";

type Appointment = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-surface-variant text-on-surface-variant border-outline-variant",
  confirmed: "bg-primary-container/20 text-primary border-primary/20",
  completed: "bg-secondary-container/40 text-secondary border-secondary/20",
  cancelled: "bg-error-container/20 text-error border-error/20",
  no_show: "bg-error-container/20 text-error border-error/20",
};

export function AppointmentCalendar({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const daysGrid: { day: number; isCurrentMonth: boolean; dateString: string }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevTotalDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    daysGrid.push({
      day: d,
      isCurrentMonth: false,
      dateString: prevMonthDate.toISOString().split("T")[0],
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const curMonthDate = new Date(year, month, i);
    daysGrid.push({
      day: i,
      isCurrentMonth: true,
      dateString: curMonthDate.toISOString().split("T")[0],
    });
  }

  // Next month padding days to fill 6-week grid (42 cells)
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    daysGrid.push({
      day: i,
      isCurrentMonth: false,
      dateString: nextMonthDate.toISOString().split("T")[0],
    });
  }

  // Group appointments by date string (YYYY-MM-DD)
  const appointmentsByDate = initialAppointments.reduce((acc, app) => {
    const dateStr = app.start_time.split("T")[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(app);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-md border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-sm">
          <button
            onClick={prevMonth}
            className="p-xs rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            title="Previous Month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <h3 className="text-headline-sm font-semibold text-on-surface min-w-[120px] text-center">
            {monthName} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-xs rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            title="Next Month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
        <button
          onClick={today}
          className="px-md h-8 rounded-lg border border-outline text-label-md hover:bg-surface-container-high transition-colors font-medium"
        >
          Today
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-lowest text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-label-sm text-on-surface-variant font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-outline-variant bg-outline-variant/10">
        {daysGrid.map(({ day, isCurrentMonth, dateString }, idx) => {
          const dayApps = appointmentsByDate[dateString] ?? [];
          const isToday = new Date().toISOString().split("T")[0] === dateString;

          return (
            <div
              key={`${dateString}-${idx}`}
              className={`min-h-[110px] p-2 flex flex-col bg-surface hover:bg-surface-container-lowest/50 transition-colors relative group ${
                isCurrentMonth ? "text-on-surface" : "text-on-surface-variant/40"
              }`}
            >
              {/* Day number */}
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-label-md rounded-full font-medium ${
                    isToday
                      ? "bg-primary text-on-primary"
                      : isCurrentMonth
                      ? "text-on-surface"
                      : "text-on-surface-variant/40"
                  }`}
                >
                  {day}
                </span>

                {/* Add appointment shortcut on hover */}
                <Link
                  href={`/appointments/new?date=${dateString}`}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-container-high text-primary transition-opacity"
                  title="Schedule here"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </Link>
              </div>

              {/* Appointments List */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                {dayApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/appointments/${app.id}`}
                    className={`block px-1.5 py-0.5 rounded border text-[11px] font-medium leading-normal truncate transition-shadow hover:shadow-sm ${
                      STATUS_COLORS[app.status] ?? "bg-surface-variant text-on-surface-variant"
                    }`}
                    title={`${app.patients?.full_name ?? "Patient"} - ${app.reason ?? "Consultation"}`}
                  >
                    <span className="font-semibold">{formatTime(app.start_time)}</span>{" "}
                    {app.patients?.full_name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
