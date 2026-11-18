import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function ThemeProbe() {
  const { setTheme } = useTheme();
  return createElement("button", { onClick: () => setTheme("dark") }, "dark");
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    delete document.documentElement.dataset.theme;
  });

  it("persists and applies a dark theme", async () => {
    render(createElement(ThemeProvider, null, createElement(ThemeProbe)));
    fireEvent.click(screen.getByText("dark"));
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "dark"));
    expect(document.cookie).toContain("acme_theme=dark");
  });
});
