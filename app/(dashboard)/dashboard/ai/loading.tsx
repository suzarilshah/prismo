import { LoadingSpinner } from "@/components/loading-spinner";

export default function AIPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="xl" text="Loading AI Assistant..." />
    </div>
  );
}
