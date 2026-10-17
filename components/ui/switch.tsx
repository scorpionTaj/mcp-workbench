"use client";

import * as React from "react";
import { Switch as HeroSwitch } from "@heroui/react";

// The app's switch API (checked / onCheckedChange), rendered by HeroUI.
// `children` is the visible label: it names the switch and toggles it when clicked.
function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  children,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}) {
  return (
    <HeroSwitch
      data-slot="switch"
      isSelected={checked}
      defaultSelected={defaultChecked}
      onChange={onCheckedChange}
      isDisabled={disabled}
      size="sm"
      className={className}
      id={id}
      aria-label={ariaLabel}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
        {children}
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}

export { Switch };
