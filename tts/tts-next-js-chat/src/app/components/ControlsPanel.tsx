"use client";
import { ReactNode } from "react";

interface ControlsPanelProps {
  children?: ReactNode;
}

export default function ControlsPanel({ children }: ControlsPanelProps) {
  return (
    <aside className="flex-shrink-0 basis-64 sm:basis-72 md:basis-80 lg:basis-96 min-w-[260px] h-full bg-white p-6 md:p-8 border-l border-gray-200 shadow-sm rounded-r-2xl flex flex-col gap-6">
      {children}
    </aside>
  );
}
