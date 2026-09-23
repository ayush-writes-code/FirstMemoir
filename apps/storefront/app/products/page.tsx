import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { PROTOTYPE_CATALOG, PROTOTYPE_CATEGORIES } from '@/lib/prototype-data';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const { category, sort } = await searchParams;
  
  // Use verified prototype data instead of API for now
  let products = [...PROTOTYPE_CATALOG];
  const categories = PROTOTYPE_CATEGORIES;
  
  // Basic filtering
  if (category) {
    products = products.filter(p => p.categories?.some(c => c.slug === category));
  }

  // Basic sorting
  products.sort((a, b) => {
    if (sort === 'price_asc') {
      const priceA = Number(a.base_price) || 999999;
      const priceB = Number(b.base_price) || 999999;
      return priceA - priceB;
    }
    if (sort === 'price_desc') {
      const priceA = Number(a.base_price) || 0;
      const priceB = Number(b.base_price) || 0;
      return priceB - priceA;
    }
    // Default: newest (by created_at)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
            <Link href={`/products?category=${category || ''}&sort=newest`} className={`text-sm transition-opacity ${(!sort || sort === 'newest') ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Newest</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_asc`} className={`text-sm transition-opacity ${sort === 'price_asc' ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Price Low–High</Link>
            <span className="text-hairline">|</span>
            <Link href={`/products?category=${category || ''}&sort=price_desc`} className={`text-sm transition-opacity ${sort === 'price_desc' ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}>Price High–Low</Link>
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
    </div>
  );
}
