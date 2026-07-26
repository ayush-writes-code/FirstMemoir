import { EmptyState } from '@/components/EmptyState';

export default function ProductNotFound() {
  return (
    <div className="max-w-content mx-auto px-4 py-20 min-h-[60vh] flex items-center justify-center">
      <EmptyState 
        title="Product Not Found"
        description="We couldn't find the product you're looking for. It might have been removed or the link is incorrect."
        cta={{ label: "Browse All Prints", href: "/products" }}
      />
    </div>
  );
}
