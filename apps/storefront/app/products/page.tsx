import { products as productsApi, categories as categoriesApi } from '@repo/api-client';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; sort?: string }>;
}) {
  const { category, page, sort } = await searchParams;
  const currentPage = page ? parseInt(page) : 1;
  
  const [productsRes, categoriesRes] = await Promise.all([
    productsApi.getProducts({ category, page: currentPage, sort }),
    categoriesApi.getCategories(),
  ]);

  const products = productsRes.success ? productsRes.data || [] : [];
  const categories = categoriesRes.success ? categoriesRes.data || [] : [];
  
  // Basic filtering for heading
  const currentCategoryObj = categories.find(c => c.slug === category);
  const pageTitle = currentCategoryObj ? currentCategoryObj.name : 'All Prints';

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-12 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">{pageTitle}</h1>
        <p className="text-muted mt-2">{products.length} products</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between mb-8 items-start md:items-center">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
          <Link 
            href="/products"
            className={`whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
              !category ? 'bg-ink text-white' : 'bg-surface-soft text-ink hover:bg-hairline'
            }`}
          >
            All
          </Link>
          {categories.map(c => (
            <Link 
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                category === c.slug ? 'bg-ink text-white' : 'bg-surface-soft text-ink hover:bg-hairline'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted whitespace-nowrap">Sort by:</span>
          <div className="flex gap-2">
            <Link href={`/products?category=${category || ''}&sort=newest`} className="text-sm text-ink hover:text-brand">Newest</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_asc`} className="text-sm text-ink hover:text-brand">Price Low to High</Link>
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No products found"
          description={category ? `We couldn't find any products in the ${pageTitle} category.` : "We're currently updating our catalog."}
          cta={{ label: "View All Prints", href: "/products" }}
        />
      )}

      {products.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8 border-t border-hairline pt-8">
          <Link 
            href={`/products?category=${category || ''}&page=${Math.max(1, currentPage - 1)}`}
            className={`px-4 py-2 rounded-card border border-border-strong text-ink font-medium hover:bg-surface-soft ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          >
            Previous
          </Link>
          <span className="text-muted">Page {currentPage}</span>
          <Link 
            href={`/products?category=${category || ''}&page=${currentPage + 1}`}
            className="px-4 py-2 rounded-card border border-border-strong text-ink font-medium hover:bg-surface-soft"
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
