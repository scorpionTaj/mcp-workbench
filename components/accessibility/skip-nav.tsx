"use client";

import { useEffect, useState } from "react";

/**
 * Skip Navigation Link Component
 * Provides keyboard users a way to skip directly to main content
 * WCAG 2.1 Level A requirement
 */
export function SkipNav() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <a
      href="#main-content"
      className="skip-link"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        position: "absolute",
        top: isFocused ? "1rem" : "-100px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "0.75rem 1.5rem",
        background: "hsl(201 100% 55%)",
        color: "white",
        fontWeight: 600,
        borderRadius: "0.5rem",
        textDecoration: "none",
        boxShadow: "0 4px 12px hsl(0 0% 0% / 0.3)",
        transition: "top 0.3s ease",
      }}
    >
      Skip to main content
    </a>
  );
}

/**
 * Keyboard Navigation Helper
 * Shows visual indicator when user is navigating via keyboard
 */
export function KeyboardNavIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setShowIndicator(true);
      }
    };

    const handleMouseDown = () => {
      setShowIndicator(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  useEffect(() => {
    if (showIndicator) {
      document.body.classList.add("keyboard-nav");
    } else {
      document.body.classList.remove("keyboard-nav");
    }
  }, [showIndicator]);

  return null;
}

/**
 * Screen Reader Announcement Component
 * Announces dynamic content changes to screen readers
 */
interface AnnouncementProps {
  message: string;
  priority?: "polite" | "assertive";
}

export function ScreenReaderAnnouncement({
  message,
  priority = "polite",
}: AnnouncementProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Visually Hidden Component
 * Hides content visually but keeps it accessible to screen readers
 */
interface VisuallyHiddenProps {
  children: React.ReactNode;
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  focusable = false,
}: VisuallyHiddenProps) {
  return (
    <span className={focusable ? "sr-only-focusable" : "sr-only"}>
      {children}
    </span>
  );
}
