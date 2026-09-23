import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import type { ProductDto } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

// Customer Taxonomy (Categories) vs Source Taxonomy (Directories)
// This is the CUSTOMER-FACING categorization for the prototype.
const PROTOTYPE_CATEGORIES = [
  { id: 'cat-frames', slug: 'frames', name: 'Wall Frames' },
  { id: 'cat-posters', slug: 'posters', name: 'Posters & Wall Art' },
  { id: 'cat-bookmarks', slug: 'bookmarks', name: 'Bookmarks' },
];

// Verified catalog subset for the prototype shop page
// We map the "design variants" as individual products for the prototype to show grid density,
// but acknowledge that the final DB structure might use Options instead.
const PROTOTYPE_CATALOG: ProductDto[] = [
  {
    id: 'prod-porsche',
    slug: 'porsche-gt3-rs-frame',
    name: 'Porsche GT3 RS Wall Frame',
    base_price: '249', // Verified
    categories: [{ product_id: 'prod-porsche', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-1', product_id: 'prod-porsche', url: '/catalog/frames/porsche-1.jpg', alt_text: 'Porsche GT3 RS', order: 0 }],
    created_at: '2026-09-20T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-ronaldo-frame',
    slug: 'cristiano-ronaldo-jersey-frame',
    name: 'Cristiano Ronaldo Jersey Frame',
    base_price: '299', // Verified
    categories: [{ product_id: 'prod-ronaldo-frame', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-2', product_id: 'prod-ronaldo-frame', url: '/catalog/frames/football-ronaldo-1.jpg', alt_text: 'Ronaldo', order: 0 }],
    created_at: '2026-09-19T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-mbappe-frame',
    slug: 'kylian-mbappe-jersey-frame',
    name: 'Kylian Mbappé Jersey Frame',
    base_price: '299', // Verified
    categories: [{ product_id: 'prod-mbappe-frame', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-3', product_id: 'prod-mbappe-frame', url: '/catalog/frames/football-mbappe-1.jpg', alt_text: 'Mbappe', order: 0 }],
    created_at: '2026-09-18T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-motivation-03',
    slug: 'hustle-hard-motivation-frame',
    name: 'Hustle Hard Motivation Frame',
    base_price: '299', // Verified
    categories: [{ product_id: 'prod-motivation-03', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-4', product_id: 'prod-motivation-03', url: '/catalog/frames/motivation-03-1.jpg', alt_text: 'Motivation 03', order: 0 }],
    created_at: '2026-09-15T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-motivation-09',
    slug: 'focus-motivation-frame',
    name: 'Focus Motivation Frame',
    base_price: '299', // Verified
    categories: [{ product_id: 'prod-motivation-09', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-5', product_id: 'prod-motivation-09', url: '/catalog/frames/motivation-09-1.jpg', alt_text: 'Motivation 09', order: 0 }],
    created_at: '2026-09-14T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-cars-supra',
    slug: 'toyota-supra-wall-frame',
    name: 'Toyota Supra Wall Frame',
    base_price: '0', // F&F Cars had NO metadata/info.txt, mark as missing price
    categories: [{ product_id: 'prod-cars-supra', category_id: 'cat-frames', category: { id: 'cat-frames', name: 'Wall Frames', slug: 'frames' } }],
    images: [{ id: 'img-6', product_id: 'prod-cars-supra', url: '/catalog/frames/cars-supra-1.jpg', alt_text: 'Supra', order: 0 }],
    created_at: '2026-09-16T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-ronaldo-split',
    slug: 'ronaldo-real-madrid-split-poster',
    name: 'Cristiano Ronaldo Real Madrid Split Poster',
    base_price: '299', // Verified
    categories: [{ product_id: 'prod-ronaldo-split', category_id: 'cat-posters', category: { id: 'cat-posters', name: 'Posters', slug: 'posters' } }],
    images: [{ id: 'img-7', product_id: 'prod-ronaldo-split', url: '/catalog/posters/ronaldo-split-realmadrid-1.jpg', alt_text: 'Ronaldo Split', order: 0 }],
    created_at: '2026-09-17T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-anime-12',
    slug: 'anime-mix-poster-pack-12',
    name: 'Anime Mix Poster Pack (Set of 12)',
    base_price: '0', // Unverified placeholder [Generate XXX rupees]
    categories: [{ product_id: 'prod-anime-12', category_id: 'cat-posters', category: { id: 'cat-posters', name: 'Posters', slug: 'posters' } }],
    images: [{ id: 'img-8', product_id: 'prod-anime-12', url: '/catalog/posters/anime-pack12-1.jpg', alt_text: 'Anime Pack 12', order: 0 }],
    created_at: '2026-09-10T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-carsplit-lambo',
    slug: 'lamborghini-split-poster-set',
    name: 'Lamborghini Pink Split Poster Set',
    base_price: '0', // Unverified placeholder [Generate 150 rupees]
    categories: [{ product_id: 'prod-carsplit-lambo', category_id: 'cat-posters', category: { id: 'cat-posters', name: 'Posters', slug: 'posters' } }],
    images: [{ id: 'img-9', product_id: 'prod-carsplit-lambo', url: '/catalog/posters/carsplit-lambo-1.jpg', alt_text: 'Lambo Split', order: 0 }],
    created_at: '2026-09-13T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
  {
    id: 'prod-animal-bm1',
    slug: 'animal-theme-bookmarks-set',
    name: 'Animal Theme Bookmarks (Set of 5)',
    base_price: '0', // Unverified placeholder [Generate 100 rupees]
    categories: [{ product_id: 'prod-animal-bm1', category_id: 'cat-bookmarks', category: { id: 'cat-bookmarks', name: 'Bookmarks', slug: 'bookmarks' } }],
    images: [{ id: 'img-10', product_id: 'prod-animal-bm1', url: '/catalog/bookmarks/animal-bm1-1.jpg', alt_text: 'Animal Bookmarks', order: 0 }],
    created_at: '2026-09-12T00:00:00Z',
    is_active: true, sku: "", description: "", updated_at: "2026-09-20T00:00:00Z",
  } as unknown as ProductDto,
];

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
    products = products.filter(p => p.categories?.some(c => c.category?.slug === category));
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
