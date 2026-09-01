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
    categoriesApi.getCategories({ active: true }),
  ]);

  const products = productsRes.success ? productsRes.data || [] : [];
  const categories = categoriesRes.success ? categoriesRes.data || [] : [];
  const totalPages = productsRes.meta?.totalPages || 1;
  
  // Basic filtering for heading
  const currentCategoryObj = categories.find(c => c.slug === category);
  const pageTitle = currentCategoryObj ? currentCategoryObj.name : 'All Prints';

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-16 min-h-screen">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif text-ink tracking-tight">{pageTitle}</h1>
        <p className="text-muted mt-3 font-light">{products.length} products</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 justify-between mb-12 items-center border-b border-hairline pb-4">
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
          <Link 
            href="/products"
            className={`whitespace-nowrap pb-2 text-sm uppercase tracking-wider transition-colors ${
              !category ? 'text-ink border-b-2 border-ink font-medium' : 'text-muted hover:text-ink border-b-2 border-transparent'
            }`}
          >
            All
          </Link>
          {categories.map(c => (
            <Link 
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`whitespace-nowrap pb-2 text-sm uppercase tracking-wider transition-colors ${
                category === c.slug ? 'text-ink border-b-2 border-ink font-medium' : 'text-muted hover:text-ink border-b-2 border-transparent'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted whitespace-nowrap">Sort:</span>
          <div className="flex gap-3">
            <Link href={`/products?category=${category || ''}&sort=newest`} className="text-sm text-ink hover:opacity-70 transition-opacity">Newest</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_asc`} className="text-sm text-ink hover:opacity-70 transition-opacity">Price Low to High</Link>
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
          <span className="text-muted">Page {currentPage} of {totalPages}</span>
          <Link 
            href={`/products?category=${category || ''}&page=${currentPage + 1}`}
            className={`px-4 py-2 rounded-card border border-border-strong text-ink font-medium hover:bg-surface-soft ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
