import { LoadingSpinner } from "@/components/loading-spinner";

export default function TaxLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="md" text="Loading tax data..." />
    </div>
  );
}
