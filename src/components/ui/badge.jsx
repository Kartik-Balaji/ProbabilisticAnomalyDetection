import React from "react";

export function Badge({ children, color = "gray" }) {
  const colors = {
    gray: "bg-gray-200 text-gray-800",
    green: "bg-green-200 text-green-800",
    red: "bg-red-200 text-red-800",
    yellow: "bg-yellow-200 text-yellow-800",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
