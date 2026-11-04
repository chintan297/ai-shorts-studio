import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Content Calendar" };

export default function CalendarPage() {
  return <CalendarView />;
}
