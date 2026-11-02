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

describe("context graph mutations (Owner)", () => {
  it("reconnects and removes edges, updates node details", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <ShajaraProvider>{children}</ShajaraProvider>;
    const { result } = renderHook(() => useShajara(), { wrapper });
    act(() => {
      const { user } = result.current.beginLogin("Owner Person", "1990-01-01");
      result.current.startOwnTree(user);
    });
    let childId = "";
    let edgeId = "";
    const selfId = result.current.user!.nodeId!;
    act(() => {
      childId = result.current.addNode({ fullName: "Kid", birthDate: "2020-01-01", gender: "female" }).id;
    });
    act(() => {
      edgeId = result.current.addEdge({ from: selfId, to: childId, type: "parent" }).id;
    });
    let otherId = "";
    act(() => {
      otherId = result.current.addNode({ fullName: "Other", birthDate: "1991-01-01", gender: "male" }).id;
    });
    act(() => result.current.reconnectEdge(edgeId, otherId, childId));
    expect(result.current.edges.find((e) => e.id === edgeId)?.from).toBe(otherId);
    act(() => result.current.updateNode(childId, { notes: "hello" }));
    expect(result.current.nodes.find((n) => n.id === childId)?.notes).toBe("hello");
    act(() => result.current.removeEdge(edgeId));
    expect(result.current.edges).toHaveLength(0);
  });
});
