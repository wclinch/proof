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
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          fontSize: "10px",
          color: "#555",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "10px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
