import { LoadingSpinner } from "@/components/loading-spinner";

export default function GoalsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="md" text="Loading goals..." />
    </div>
  );
}
