/**
 * Accessibility Utilities for MCP Workbench
 * WCAG 2.1 Level AA Compliance Helpers
 */

/**
 * Calculate relative luminance of a color
 * Used for contrast ratio calculations
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG requires:
 * - 4.5:1 for normal text (Level AA)
 * - 3:1 for large text (18pt+ or 14pt+ bold) (Level AA)
 * - 7:1 for normal text (Level AAA)
 * - 4.5:1 for large text (Level AAA)
 */
export function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG Level AA requirements
 */
export function meetsWCAGAA(
  foreground: [number, number, number],
  background: [number, number, number],
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG Level AAA requirements
 */
export function meetsWCAGAAA(
  foreground: [number, number, number],
  background: [number, number, number],
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else if (h >= 300 && h < 360) {
    [r, g, b] = [c, 0, x];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * Generate ARIA label for better screen reader support
 */
export function generateAriaLabel(
  element: string,
  context?: Record<string, any>
): string {
  const labels: Record<string, string> = {
    closeButton: "Close dialog",
    menuButton: "Open menu",
    searchButton: "Search",
    submitButton: "Submit form",
    deleteButton: "Delete item",
    editButton: "Edit item",
    saveButton: "Save changes",
    cancelButton: "Cancel",
    nextButton: "Next page",
    prevButton: "Previous page",
  };

  let label = labels[element] || element;

  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      label = label.replace(`{${key}}`, String(value));
    });
  }

  return label;
}

/**
 * Generate unique IDs for ARIA attributes
 */
let idCounter = 0;
export function generateAriaId(prefix: string = "aria"): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: high)").matches;
}

/**
 * Announce to screen readers using ARIA live regions
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
) {
  if (typeof document === "undefined") return;

  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Restore focus to previous element after closing modal/dialog
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  saveFocus() {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  restoreFocus() {
    if (this.previousFocus && typeof this.previousFocus.focus === "function") {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }
}

/**
 * Check if element is keyboard focusable
 */
export function isKeyboardFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ["a", "button", "input", "select", "textarea"];

  if (focusableTags.includes(tagName)) return true;
  if (element.tabIndex >= 0) return true;

  return false;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => isKeyboardFocusable(el)
  );
}

/**
 * Move focus to first element in container
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
}

/**
 * ARIA attributes helper
 */
export const aria = {
  /**
   * Create aria-labelledby attribute
   */
  labelledBy: (id: string) => ({ "aria-labelledby": id }),

  /**
   * Create aria-describedby attribute
   */
  describedBy: (id: string) => ({ "aria-describedby": id }),

  /**
   * Create aria-label attribute
   */
  label: (text: string) => ({ "aria-label": text }),

  /**
   * Create aria-hidden attribute
   */
  hidden: (hidden: boolean = true) => ({ "aria-hidden": String(hidden) }),

  /**
   * Create aria-expanded attribute
   */
  expanded: (expanded: boolean) => ({ "aria-expanded": String(expanded) }),

  /**
   * Create aria-selected attribute
   */
  selected: (selected: boolean) => ({ "aria-selected": String(selected) }),

  /**
   * Create aria-disabled attribute
   */
  disabled: (disabled: boolean) => ({ "aria-disabled": String(disabled) }),

  /**
   * Create aria-pressed attribute
   */
  pressed: (pressed: boolean) => ({ "aria-pressed": String(pressed) }),

  /**
   * Create aria-checked attribute
   */
  checked: (checked: boolean) => ({ "aria-checked": String(checked) }),

  /**
   * Create aria-live attribute
   */
  live: (priority: "polite" | "assertive" | "off" = "polite") => ({
    "aria-live": priority,
  }),

  /**
   * Create aria-current attribute
   */
  current: (
    type: "page" | "step" | "location" | "date" | "time" | boolean
  ) => ({
    "aria-current": String(type),
  }),
};

/**
 * Keyboard navigation helper
 */
export const keyboard = {
  /**
   * Check if key is Enter or Space (activation keys)
   */
  isActivationKey: (e: KeyboardEvent) => e.key === "Enter" || e.key === " ",

  /**
   * Check if key is Escape
   */
  isEscapeKey: (e: KeyboardEvent) => e.key === "Escape",

  /**
   * Check if key is Arrow key
   */
  isArrowKey: (e: KeyboardEvent) =>
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key),

  /**
   * Handle activation keys (Enter, Space)
   */
  onActivation: (callback: () => void) => (e: KeyboardEvent) => {
    if (keyboard.isActivationKey(e)) {
      e.preventDefault();
      callback();
    }
  },
};

/**
 * Color contrast utilities
 */
export const contrast = {
  /**
   * Check if text color has sufficient contrast with background
   */
  checkTextContrast: (
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { passes: boolean; ratio: number; level: string } => {
    // Parse HSL colors (simplified - extend as needed)
    const parseHSL = (hsl: string): [number, number, number] => {
      const match = hsl.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      if (!match) return [0, 0, 0];
      return hslToRgb(
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3])
      );
    };

    const fg = parseHSL(foreground);
    const bg = parseHSL(background);
    const ratio = getContrastRatio(fg, bg);

    const passesAA = meetsWCAGAA(fg, bg, isLargeText);
    const passesAAA = meetsWCAGAAA(fg, bg, isLargeText);

    return {
      passes: passesAA,
      ratio: Math.round(ratio * 100) / 100,
      level: passesAAA ? "AAA" : passesAA ? "AA" : "Fail",
    };
  },
};
