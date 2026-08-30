"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentSlot {
  id: string;
  patientName: string;
  doctorName: string;
  department: string;
  time: string;
  dayIndex: number; // 0: Mon, 1: Tue, 2: Wed, 3: Thu, 4: Fri, 5: Sat
  duration: number;
  status: "confirmed" | "waiting" | "in-consultation" | "completed" | "cancelled";
}

const mockSlots: AppointmentSlot[] = [
  { id: "1", patientName: "Aarav Sharma", doctorName: "Dr. Sarah Jenkins", department: "Cardiology", time: "09:00", dayIndex: 0, duration: 45, status: "confirmed" },
  { id: "2", patientName: "Priya Nair", doctorName: "Dr. Arvind Patel", department: "Pediatrics", time: "10:30", dayIndex: 1, duration: 30, status: "in-consultation" },
  { id: "3", patientName: "Rohan Varma", doctorName: "Dr. Sarah Jenkins", department: "Cardiology", time: "11:00", dayIndex: 2, duration: 60, status: "waiting" },
  { id: "4", patientName: "Ananya Iyer", doctorName: "Dr. Marcus Vance", department: "Orthopedics", time: "14:00", dayIndex: 3, duration: 45, status: "completed" },
];

const timeRows = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const weekDays = ["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28", "Sat 29"];

export function AppointmentCalendarGrid() {
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [slots, setSlots] = useState<AppointmentSlot[]>(mockSlots);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form states
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. Sarah Jenkins");
  const [department, setDepartment] = useState("Cardiology");
  const [time, setTime] = useState("09:00");
  const [dayIndex, setDayIndex] = useState(0);
  const [duration, setDuration] = useState(30);

  const getStatusBadge = (status: AppointmentSlot["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-primary-container/20 text-primary border-primary/20";
      case "in-consultation":
        return "bg-secondary-fixed text-on-secondary-fixed-variant border-secondary/20";
      case "waiting":
        return "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20";
      case "completed":
        return "bg-surface-variant text-on-surface-variant border-outline-variant";
      case "cancelled":
        return "bg-error-container text-on-error-container border-error/20";
    }
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) return;

    const newSlot: AppointmentSlot = {
      id: String(slots.length + 1),
      patientName,
      doctorName,
      department,
      time,
      dayIndex: Number(dayIndex),
      duration: Number(duration),
      status: "confirmed",
    };

    setSlots([...slots, newSlot]);
    setIsModalOpen(false);
    setPatientName("");
  };

  const filteredSlots = selectedDoctor === "all"
    ? slots
    : slots.filter((s) => s.doctorName === selectedDoctor);

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-2 relative">
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-outline-variant gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-body-md text-on-surface">August 2026</span>
          <Button variant="secondary" size="sm" className="h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="text-body-sm bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface"
          >
            <option value="all">All Practitioners</option>
            <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins (Cardiology)</option>
            <option value="Dr. Arvind Patel">Dr. Arvind Patel (Pediatrics)</option>
            <option value="Dr. Marcus Vance">Dr. Marcus Vance (Orthopedics)</option>
          </select>

          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 h-9" variant="primary">
            <Plus className="w-4 h-4" /> Book Appt
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface-variant">
            <div className="p-3 border-r border-outline-variant text-center">Time</div>
            {weekDays.map((day, idx) => (
              <div key={idx} className="p-3 text-center border-r border-outline-variant last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {timeRows.map((timeRow, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 border-b border-outline-variant/60 min-h-[75px]">
              <div className="p-2 border-r border-outline-variant text-xs font-medium text-outline text-center flex items-start justify-center pt-3">
                {timeRow}
              </div>

              {weekDays.map((_, colIdx) => {
                const match = filteredSlots.find(
                  (s) => s.dayIndex === colIdx && s.time.startsWith(timeRow.split(":")[0])
                );

                return (
                  <div key={colIdx} className="p-1.5 border-r border-outline-variant/60 last:border-r-0 relative hover:bg-surface-container-low/40 transition">
                    {match && (
                      <div className={`p-2 rounded-lg border text-xs font-medium ${getStatusBadge(match.status)} shadow-sm`}>
                        <div className="font-semibold truncate">{match.patientName}</div>
                        <div className="text-[10px] truncate">{match.doctorName}</div>
                        <div className="flex items-center gap-1 text-[10px] mt-1 opacity-80">
                          <Clock className="w-3 h-3" /> {match.time} ({match.duration}m)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 w-full max-w-md shadow-level-3">
            <h3 className="text-headline-sm font-bold text-on-surface mb-4">Book New Appointment</h3>
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-label-sm font-medium text-on-surface mb-1">Patient Name</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                  placeholder="e.g. Aarav Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1">Department</label>
                  <select
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1">Doctor</label>
                  <select
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                  >
                    <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                    <option value="Dr. Arvind Patel">Dr. Arvind Patel</option>
                    <option value="Dr. Marcus Vance">Dr. Marcus Vance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1">Day</label>
                  <select
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                    value={dayIndex}
                    onChange={(e) => setDayIndex(Number(e.target.value))}
                  >
                    <option value={0}>Mon 24</option>
                    <option value={1}>Tue 25</option>
                    <option value={2}>Wed 26</option>
                    <option value={3}>Thu 27</option>
                    <option value={4}>Fri 28</option>
                    <option value={5}>Sat 29</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1">Time</label>
                  <select
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  >
                    {timeRows.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1">Duration</label>
                  <select
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-body-sm"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>60m</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Book Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
