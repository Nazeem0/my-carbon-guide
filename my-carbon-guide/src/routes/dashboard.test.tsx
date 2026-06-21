import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "./dashboard";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useActivities } from "@/hooks/useActivities";
import { useLanguage } from "@/contexts/LanguageContext";
import { MemoryRouter } from "react-router-dom";
import React from "react";

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "test-uid-123" },
  })),
}));

vi.mock("@/hooks/useActivities", () => ({
  useActivities: vi.fn(() => ({
    activities: [],
    loaded: true,
    addActivity: vi.fn(),
    getDailyTotal: vi.fn(() => 0),
    getTopActivity: vi.fn(() => null),
  })),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({
    language: "en",
    t: (key: string) => key,
  })),
}));

// Mock AppShell to avoid nested layout complexities
vi.mock("@/components/ecolog/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

describe("Dashboard Fallback Logic", () => {
  test("shows Welcome / Refresh screen when profile is null and loading is false", () => {
    vi.mocked(useUserProfile).mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      updateGoal: vi.fn(),
      updateProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Welcome to EcoLog!")).toBeDefined();
    expect(screen.getByText("Refresh Profile")).toBeDefined();
  });
});
