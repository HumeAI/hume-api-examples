"use client";

import React from "react";

interface TextAreaFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export function TextAreaField({
  id,
  name,
  label,
  placeholder = "",
  required = false,
  rows = 5,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-md font-medium text-gray-800">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 resize-none"
      />
    </div>
  );
}
