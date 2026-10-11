import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { products as productsApi, categories as categoriesApi } from '@/lib/api-client';
import { adaptApiProductToStorefront } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const { category, sort, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  // Validate sort parameter to ensure it matches the backend schema
  const validSort = sort === 'price_asc' || sort === 'price_desc' || sort === 'newest' ? sort : undefined;

  // Fetch real catalog data from the API
  let productsRes;
  let categoriesRes;
  try {
    [productsRes, categoriesRes] = await Promise.all([
      productsApi.getProducts({ category, sort: validSort, page: currentPage, limit: 50 }),
      categoriesApi.getCategories()
    ]);
  } catch (err) {
    console.error("Failed to fetch products/categories from API:", err);
    productsRes = { success: false, data: [], error: 'Failed to connect to API', meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    categoriesRes = { success: false, data: [] };
  }

  const products = (productsRes.success && productsRes.data) ? productsRes.data : [];
  const categories = (categoriesRes.success && categoriesRes.data) ? categoriesRes.data : [];
  const meta = productsRes.meta || { total: products.length, page: currentPage, limit: 50, totalPages: 1 };
  const totalPages = meta.totalPages || 1;
  const totalCount = meta.total ?? products.length;

  const currentCategoryObj = categories.find(c => c.slug === category);
  const pageTitle = currentCategoryObj ? currentCategoryObj.name : 'All Prints';

  const buildQueryString = (newPage: number) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (newPage > 1) params.set('page', newPage.toString());
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-16 min-h-screen">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif text-ink tracking-tight">{pageTitle}</h1>
        <p className="text-muted mt-3 font-light">{totalCount} {totalCount === 1 ? 'product' : 'products'}</p>
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
            <Link href={`/products?category=${category || ''}&sort=newest`} className={`text-sm transition-opacity ${(!sort || sort === 'newest') ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Newest</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_asc`} className={`text-sm transition-opacity ${sort === 'price_asc' ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Price Low–High</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_desc`} className={`text-sm transition-opacity ${sort === 'price_desc' ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Price High–Low</Link>
          </div>
        </div>
      </div>

      {!productsRes.success ? (
        <EmptyState
          title="Catalogue Temporarily Unavailable"
          description="We are experiencing a temporary issue retrieving products. Please try refreshing or check back shortly."
          cta={{ label: "Retry", href: "/products" }}
        />
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={adaptApiProductToStorefront(product)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline pt-6 mt-12">
              <div className="text-xs uppercase tracking-wider text-muted">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </div>
              <div className="flex items-center gap-3">
                {currentPage > 1 ? (
                  <Link
                    href={buildQueryString(currentPage - 1)}
                    className="px-4 py-2 text-xs uppercase tracking-wider font-medium text-ink bg-surface-soft border border-hairline rounded hover:bg-neutral-100 transition-colors"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-xs uppercase tracking-wider text-muted-soft border border-hairline/50 rounded cursor-not-allowed">
                    ← Previous
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildQueryString(currentPage + 1)}
                    className="px-4 py-2 text-xs uppercase tracking-wider font-medium text-ink bg-surface-soft border border-hairline rounded hover:bg-neutral-100 transition-colors"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-xs uppercase tracking-wider text-muted-soft border border-hairline/50 rounded cursor-not-allowed">
                    Next →
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No products found"
          description={category ? `We couldn't find any products in the ${pageTitle} category.` : "We're currently updating our catalog."}
          cta={{ label: "View All Prints", href: "/products" }}
        />
      )}
    </div>
  );
}
