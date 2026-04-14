"use client";
import { ReactNode } from "react";

export default function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontSize: "10px",
          color: "#3a3a3a",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "8px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
