"use client";

import { useEffect, useState } from "react";

interface Props {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-[#1a1a2e] text-white text-sm font-semibold px-5 py-3 rounded-3xl shadow-lg whitespace-nowrap">
        {message}
      </div>
    </div>
  );
}
