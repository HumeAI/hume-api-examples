"use client";

import React from "react";

interface ClipCardProps {
  voiceName: string;
  text: string;
  description?: string;
  url: string;
}

export function AudioClipCard({ voiceName, text, description, url }: ClipCardProps) {
  return (
    <div className="flex flex-col items-start bg-gray-50 p-4 rounded-lg shadow-sm transition-colors">
      <p className="mb-2 font-medium text-gray-800">
        <strong>Voice:</strong> {voiceName}
      </p>
      <p className="mb-2 font-medium text-gray-800">
        <strong>Text:</strong> "{text}"
      </p>
      {description && (
        <p className="mb-2 font-medium text-gray-800">
          <strong>Description:</strong> "{description}"
        </p>
      )}
      <audio controls src={url} className="w-full" />
    </div>
  );
}
