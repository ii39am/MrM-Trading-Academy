// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => cleanup());

describe("site theme control", () => {
  it("switches theme and persists an explicit preference", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle locale="en" />);
    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Light" }));
    expect(localStorage.getItem("mrm-theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("light");
  });

  it("restores a persisted dark preference without a hydration-dependent default", async () => {
    localStorage.setItem("mrm-theme", "dark");
    render(<ThemeToggle locale="en" />);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(document.documentElement.dataset.themePreference).toBe("dark");
  });

  it("uses the system setting and removes an explicit stored preference", async () => {
    localStorage.setItem("mrm-theme", "light");
    const user = userEvent.setup();
    render(<ThemeToggle locale="en" />);
    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(screen.getByRole("menuitemradio", { name: "System" }));
    expect(localStorage.getItem("mrm-theme")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("system");
  });

  it("renders localized Arabic theme options", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle locale="ar" />);
    await user.click(screen.getByRole("button", { name: "المظهر" }));
    expect(screen.getByRole("menuitemradio", { name: "فاتح" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "داكن" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "حسب النظام" })).toBeTruthy();
  });
});
