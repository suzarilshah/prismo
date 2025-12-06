import { LoadingSpinner } from "@/components/loading-spinner";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <LoadingSpinner size="xl" text="Loading dashboard..." />
    </div>
  );
}
