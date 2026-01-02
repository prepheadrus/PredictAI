import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <SidebarNav />
        <main className="flex flex-col flex-1 sm:pl-14">
          <div className="flex-1 overflow-auto p-4 sm:px-6 md:gap-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
