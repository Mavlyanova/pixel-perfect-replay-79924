import { createFileRoute } from "@tanstack/react-router";
import { ShajaraProvider } from "@/context/ShajaraContext";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shajara — Oila shajarasi" },
      { name: "description", content: "Shajara: build and share your family tree in Uzbek, Russian or English." },
      { property: "og:title", content: "Shajara — Oila shajarasi" },
      { property: "og:description", content: "Build and share your family tree together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ShajaraProvider>
      <AppShell />
      <Toaster />
    </ShajaraProvider>
  );
}
