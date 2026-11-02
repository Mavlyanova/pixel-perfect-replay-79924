import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ShajaraProvider } from "@/context/ShajaraContext";

const { fitView, flow } = vi.hoisted(() => {
  const fitView = vi.fn().mockResolvedValue(true);
  return { fitView, flow: { fitView } };
});

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("@xyflow/react")>(),
  useReactFlow: () => flow,
  useNodesInitialized: () => true,
  ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
  ReactFlow: ({ nodes }: { nodes: { id: string; data: { person: { fullName: string } } }[] }) => (
    <div aria-label="Family canvas">{nodes.map((node) => <span key={node.id}>{node.data.person.fullName}</span>)}</div>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("shajara:lang", "en");
  fitView.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
});

describe("People to Tree focus", () => {
  it("switches to Tree and animates only the selected unique node, including repeat visits", async () => {
    render(<ShajaraProvider><AppShell /></ShajaraProvider>);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Aziz Yusupov" } });
    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "1995-05-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, that's me" }));
    await waitFor(() => expect(fitView).toHaveBeenCalled());

    for (let visit = 0; visit < 2; visit++) {
      fireEvent.click(screen.getAllByRole("button", { name: "People", exact: true })[0]);
      fitView.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Tree: Aziz Yusupov", exact: true }));
      expect(within(screen.getByLabelText("Family canvas")).getByText("Aziz Yusupov")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      await waitFor(() => expect(fitView).toHaveBeenCalledWith({
        nodes: [{ id: "n-child" }], padding: 0.5, maxZoom: 1.5, duration: 600,
      }));
      expect(fitView).toHaveBeenCalledTimes(1);
    }
  });
});