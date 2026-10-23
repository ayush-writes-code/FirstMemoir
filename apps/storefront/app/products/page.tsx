import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { products as productsApi, categories as categoriesApi } from '@/lib/api-client';
import { adaptApiProductToStorefront } from '@/types';

export const dynamic = 'force-dynamic';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  frames: '8×12″ contemporary wall hanging frames printed on 300 GSM photographic paper. Fitted with mounting hooks and delivered ready to hang.',
  posters: 'High-definition poster packs and multi-panel split sets printed on heavyweight photographic paper with vivid archival inks.',
  bookmarks: 'Curated double-sided bookmark sets printed on 300 GSM photographic card stock.',
  'wall-art': 'Statement wall prints and curated framed collections crafted for modern living and workspace interiors.',
  'custom-prints': 'Custom photo prints and bespoke framing tailored to your personal memories and moments.',
};

const DEFAULT_DESCRIPTION =
  'Explore our complete collection of framed wall prints, curated poster packs, and themed bookmarks — printed on 300 GSM photographic paper and delivered pan-India.';

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
  const categoryDescription = (category && CATEGORY_DESCRIPTIONS[category]) || DEFAULT_DESCRIPTION;

  const buildFilterUrl = (overrides: { category?: string | null; sort?: string | null; page?: number | null }) => {
    const params = new URLSearchParams();
    const targetCategory = overrides.category !== undefined ? overrides.category : category;
    const targetSort = overrides.sort !== undefined ? overrides.sort : sort;
    const targetPage = overrides.page !== undefined ? overrides.page : undefined;

    if (targetCategory) params.set('category', targetCategory);
    if (targetSort && targetSort !== 'newest') params.set('sort', targetSort);
    if (targetPage && targetPage > 1) params.set('page', targetPage.toString());

    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  return (
    <div className="max-w-content w-full max-w-full overflow-x-hidden mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-18 min-h-screen">
      {/* ─── Editorial Header ─── */}
      <div className="mb-10 sm:mb-12 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-editorial-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-[10px] sm:text-xs font-medium tracking-[0.14em] uppercase text-body mb-3 sm:mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
          <span>Curated Gallery Archive</span>
          <span className="text-hairline" aria-hidden="true">•</span>
          <span className="text-muted-soft font-mono">Pan-India</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-ink-deep font-normal tracking-tight">
          {pageTitle}
        </h1>
        <p className="mt-3 text-sm sm:text-base md:text-lg text-body max-w-2xl font-light leading-relaxed">
          {categoryDescription}
        </p>
        <p className="mt-2 text-xs sm:text-sm font-mono text-muted-soft uppercase tracking-wider">
          {totalCount} {totalCount === 1 ? 'item' : 'items'} in collection
        </p>
      </div>

      {/* ─── Filter & Sort Toolbar ─── */}
      <div className="mb-10 sm:mb-12 border-b border-editorial-border pb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-6 w-full max-w-full">
        {/* Category Pills Navigation (Horizontal scroll on mobile, flex on desktop) */}
        <div className="w-full max-w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <div className="inline-flex items-center gap-2">
            <Link
              href={buildFilterUrl({ category: null })}
              className={`px-4 py-2 rounded-pill text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-200 ${
                !category
                  ? 'bg-[#18181A] text-white shadow-sm'
                  : 'bg-white text-body hover:text-ink-deep border border-editorial-border hover:border-ink/40'
              }`}
            >
              All Prints
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={buildFilterUrl({ category: c.slug })}
                className={`px-4 py-2 rounded-pill text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-200 ${
                  category === c.slug
                    ? 'bg-[#18181A] text-white shadow-sm'
                    : 'bg-white text-body hover:text-ink-deep border border-editorial-border hover:border-ink/40'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Sort Segmented Control */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
          <span className="text-xs uppercase tracking-wider text-muted font-mono font-medium whitespace-nowrap hidden sm:inline">
            Sort:
          </span>
          <div className="grid grid-cols-3 sm:flex sm:items-center p-1 bg-surface-soft rounded-pill border border-editorial-border/80 text-xs w-full sm:w-auto">
            <Link
              href={buildFilterUrl({ sort: 'newest' })}
              className={`py-1.5 px-1 sm:px-3 rounded-pill text-center transition-all whitespace-nowrap ${
                (!sort || sort === 'newest')
                  ? 'bg-white text-ink-deep font-medium shadow-sm'
                  : 'text-muted hover:text-ink-deep'
              }`}
              aria-current={(!sort || sort === 'newest') ? 'true' : undefined}
            >
              Newest
            </Link>
            <Link
              href={buildFilterUrl({ sort: 'price_asc' })}
              className={`py-1.5 px-1 sm:px-3 rounded-pill text-center transition-all whitespace-nowrap ${
                sort === 'price_asc'
                  ? 'bg-white text-ink-deep font-medium shadow-sm'
                  : 'text-muted hover:text-ink-deep'
              }`}
              aria-current={sort === 'price_asc' ? 'true' : undefined}
            >
              <span className="hidden sm:inline">Price: Low–High</span>
              <span className="sm:hidden">Low–High</span>
            </Link>
            <Link
              href={buildFilterUrl({ sort: 'price_desc' })}
              className={`py-1.5 px-1 sm:px-3 rounded-pill text-center transition-all whitespace-nowrap ${
                sort === 'price_desc'
                  ? 'bg-white text-ink-deep font-medium shadow-sm'
                  : 'text-muted hover:text-ink-deep'
              }`}
              aria-current={sort === 'price_desc' ? 'true' : undefined}
            >
              <span className="hidden sm:inline">Price: High–Low</span>
              <span className="sm:hidden">High–Low</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Products Grid / Empty State ─── */}
      {!productsRes.success ? (
        <EmptyState
          title="Catalogue Temporarily Unavailable"
          description="We are experiencing a temporary issue retrieving products. Please try refreshing or check back shortly."
          cta={{ label: "Retry", href: "/products" }}
        />
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-7 lg:gap-y-12 mb-16">
            {products.map((product) => (
              <ProductCard key={product.id} product={adaptApiProductToStorefront(product)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-editorial-border pt-8 mt-12 gap-4">
              <div className="text-xs font-mono uppercase tracking-wider text-muted">
                Showing {(currentPage - 1) * 50 + 1}–{Math.min(currentPage * 50, totalCount)} of {totalCount} prints
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildFilterUrl({ page: currentPage - 1 })}
                    className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-deep bg-white border border-editorial-border rounded-pill hover:border-ink/40 transition-colors"
                    aria-label="Go to previous page"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span
                    className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-soft/60 border border-editorial-border/60 rounded-pill cursor-not-allowed bg-surface-soft/50"
                    aria-disabled="true"
                  >
                    ← Previous
                  </span>
                )}

                {/* Numbered Page Pills */}
                <div className="flex items-center gap-1.5 mx-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Link
                      key={pageNum}
                      href={buildFilterUrl({ page: pageNum })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        pageNum === currentPage
                          ? 'bg-[#18181A] text-white shadow-sm'
                          : 'bg-white text-body border border-editorial-border hover:border-ink/40'
                      }`}
                      aria-current={pageNum === currentPage ? 'page' : undefined}
                      aria-label={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </Link>
                  ))}
                </div>

                {currentPage < totalPages ? (
                  <Link
                    href={buildFilterUrl({ page: currentPage + 1 })}
                    className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-deep bg-white border border-editorial-border rounded-pill hover:border-ink/40 transition-colors"
                    aria-label="Go to next page"
                  >
                    Next →
                  </Link>
                ) : (
                  <span
                    className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-soft/60 border border-editorial-border/60 rounded-pill cursor-not-allowed bg-surface-soft/50"
                    aria-disabled="true"
                  >
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
