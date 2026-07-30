import { Header } from '@/components/Header';
import { ManagementDashboard } from '@/components/ManagementDashboard';
import { Sidebar } from '@/components/Sidebar';

export default function PainelPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-4 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Header />
          <ManagementDashboard />
        </div>
      </main>
    </div>
  );
}
