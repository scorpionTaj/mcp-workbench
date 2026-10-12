"use client";

import * as React from "react";
import { Switch as HeroSwitch } from "@heroui/react";

// The app's switch API (checked / onCheckedChange), rendered by HeroUI.
function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
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
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}

export { Switch };
