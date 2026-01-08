"use client";

import * as React from "react";
import * as Slider from "@radix-ui/react-slider";

type Props = {
  value: [number, number];
  onChange: (next: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
};

export default function DualRangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: Props) {
  return (
    <Slider.Root
      className="relative flex w-full touch-none select-none items-center"
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
    >
      <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/15">
        <Slider.Range className="absolute h-full bg-white/60" />
      </Slider.Track>

      <Slider.Thumb className="block h-5 w-5 rounded-full border border-white/40 bg-white shadow outline-none focus:ring-2 focus:ring-white/40" />
      <Slider.Thumb className="block h-5 w-5 rounded-full border border-white/40 bg-white shadow outline-none focus:ring-2 focus:ring-white/40" />
    </Slider.Root>
  );
}
