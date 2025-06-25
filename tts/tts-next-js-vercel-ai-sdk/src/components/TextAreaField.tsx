"use client";

import React, { useState } from "react";

interface TextAreaFieldProps {
  id: string;
  name: string;
  label: string;
  maxLength: number;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export function TextAreaField({
  id,
  name,
  label,
  maxLength,
  placeholder = "",
  required = false,
  rows = 5,
}: TextAreaFieldProps) {
  const [value, setValue] = useState("");
  const count = value.length;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.slice(0, maxLength);
    setValue(next);
  }

  return (
    <div className="relative space-y-1">
      <label htmlFor={id} className="block text-md font-medium text-gray-800">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 resize-none"
      />
      <div className="absolute bottom-1 right-2 text-sm text-gray-900">
        {count}/{maxLength}
      </div>
    </div>
  );
}
