import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { ShajaraProvider, useShajara } from "@/context/ShajaraContext";
import { AppShell } from "@/components/AppShell";
import { STORAGE_KEY } from "@/lib/shajara";

beforeEach(() => localStorage.clear());

function fill(name: string, date: string) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: date } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("onboarding flow", () => {
  beforeEach(() => localStorage.setItem("shajara:lang", "en"));

  it("shows parental challenge and claims node as Viewer", () => {
    render(<ShajaraProvider><AppShell /></ShajaraProvider>);
    fill("Aziz Yusupov", "1995-05-20");
    expect(screen.getByText("Are you the child of Karim Yusupov and Dilnoza Yusupova?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, that's me" }));
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.trees[0].nodes.find((n: { id: string }) => n.id === "n-child").claimedBy).toBeTruthy();
  });

  it("offers new tree when no match, creating as Owner", () => {
    render(<ShajaraProvider><AppShell /></ShajaraProvider>);
    fill("New Person", "2000-01-01");
    fireEvent.click(screen.getByRole("button", { name: "Create Your Own Tree" }));
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });
});

describe("context permissions", () => {
  it("throws when a Viewer mutates", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <ShajaraProvider>{children}</ShajaraProvider>;
    const { result } = renderHook(() => useShajara(), { wrapper });
    act(() => {
      const { user, match } = result.current.beginLogin("Aziz Yusupov", "1995-05-20");
      result.current.acceptClaim(user, match!);
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => result.current.addNode({ fullName: "X", birthDate: "2000-01-01", gender: "male" })).toThrow();
    warn.mockRestore();
  });
});
