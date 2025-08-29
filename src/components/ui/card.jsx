import * as React from "react"

function Card({ className, ...props }) {
  return <div className={`rounded-2xl border bg-white shadow-md ${className}`} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={`p-4 ${className}`} {...props} />
}

export { Card, CardContent }
