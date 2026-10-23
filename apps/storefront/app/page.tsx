import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { products as productsApi, categories as categoriesApi } from '@/lib/api-client';
import { adaptApiProductToStorefront } from '@/types';

// ISR: homepage is rebuilt at most once per hour
export const revalidate = 3600;

// Fallback local catalog images for hero, editorial, and CTA sections
const HERO_IMAGE = '/catalog/frames/football-ronaldo-1.jpg';
const EDITORIAL_IMAGE = '/catalog/frames/motivation-09-1.jpg';
const CTA_IMAGE = '/catalog/frames/cars-supra-1.jpg';

// Per-category tile images for the "Shop by category" section
const CATEGORY_TILE_IMAGES: Record<string, string> = {
  frames: '/catalog/frames/motivation-03-1.jpg',
  posters: '/catalog/posters/ronaldo-split-realmadrid-1.jpg',
  bookmarks: '/catalog/bookmarks/animal-bm1-1.jpg',
  'wall-art': '/catalog/frames/cars-supra-1.jpg',
  'custom-prints': '/catalog/frames/football-ronaldo-1.jpg',
};
const CATEGORY_TILE_FALLBACK = '/catalog/frames/motivation-03-1.jpg';

// Per-category subtitle copy
const CATEGORY_SUBTITLES: Record<string, string> = {
  frames: '8×12 inch framed prints',
  posters: 'Split designs, collage kits & more',
  bookmarks: '300 GSM themed bookmark sets',
  'wall-art': 'Canvas & premium wall décor',
  'custom-prints': 'Your photo, your way',
};

export default async function Home() {
  // Fetch featured products and categories in parallel at ISR build/revalidate time
  let featuredProducts: ReturnType<typeof adaptApiProductToStorefront>[] = [];
  let apiCategories: { id: string; name: string; slug: string }[] = [];

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      productsApi.getProducts({ sort: 'newest', page: 1, limit: 4 }),
      categoriesApi.getCategories(),
    ]);
    if (productsRes.success && productsRes.data) {
      featuredProducts = productsRes.data.map(adaptApiProductToStorefront);
    }
    if (categoriesRes.success && categoriesRes.data) {
      apiCategories = categoriesRes.data;
    }
  } catch {
    // Silent fallback — static hero, editorial, trust, and CTA sections still render.
    // Featured products and category grid degrade gracefully.
  }

  // Categories to display: use live API data, or fall back to a curated static subset
  const categoriesToShow =
    apiCategories.length > 0
      ? apiCategories
      : [
          { id: 'frames', name: 'Wall Frames', slug: 'frames' },
          { id: 'posters', name: 'Posters & Wall Art', slug: 'posters' },
          { id: 'bookmarks', name: 'Bookmarks', slug: 'bookmarks' },
        ];

  return (
    <div className="flex flex-col">

      {/* ─── PREMIUM EDITORIAL HERO ─── */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-canvas-warm via-[#F6F3EC] to-[#EFEAE0] border-b border-editorial-border">
        {/* Subtle Ambient Studio Glows (strictly background z-index) */}
        <div
          className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-10 w-[380px] h-[380px] bg-surface-cream/80 rounded-full blur-2xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="max-w-content mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12 sm:pt-12 sm:pb-20 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            
            {/* Left Column: Typographic & Editorial Storytelling */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-start text-left">
              {/* Studio Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/90 border border-editorial-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-[10px] sm:text-xs font-medium tracking-[0.14em] uppercase text-body mb-4 sm:mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
                <span>Custom Print &amp; Framing Studio</span>
                <span className="text-hairline" aria-hidden="true">•</span>
                <span className="text-muted-soft font-mono">India</span>
              </div>

              {/* Main Display Headline */}
              <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.75rem] font-normal text-ink-deep tracking-tight leading-[1.1] sm:leading-[1.06] text-balance">
                Moments made timeless.{" "}
                <span className="italic font-serif text-brand block sm:inline">
                  Framed to perfection.
                </span>
              </h1>

              {/* Editorial Subtitle */}
              <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-body leading-relaxed max-w-xl font-light">
                High-definition photographic prints and premium wall frames. Printed on heavyweight 300 GSM photographic paper, assembled with care, and delivered ready to hang across India.
              </p>

              {/* Action Buttons */}
              <div className="mt-7 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-7 sm:px-8 py-3.5 sm:py-4 bg-[#18181A] text-white rounded-pill font-medium text-sm sm:text-base hover:bg-black transition-all duration-200 shadow-md hover:shadow-lg group"
                >
                  <span>Explore Collection</span>
                  <span
                    className="ml-2 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="/products?category=frames"
                  className="inline-flex items-center justify-center px-7 sm:px-8 py-3.5 sm:py-4 bg-white text-ink border border-editorial-border rounded-pill font-medium text-sm sm:text-base hover:bg-[#FAF8F5] hover:border-ink transition-all duration-200 shadow-sm"
                >
                  Shop Wall Frames
                </Link>
              </div>

              {/* Craftsmanship Metrics */}
              <div className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-editorial-border grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg">
                <div>
                  <p className="font-serif text-base sm:text-2xl font-normal text-ink-deep">300 GSM</p>
                  <p className="text-[11px] sm:text-sm text-muted mt-0.5 sm:mt-1 leading-tight">Photographic Paper</p>
                </div>
                <div className="border-l border-editorial-border pl-2.5 sm:pl-6">
                  <p className="font-serif text-base sm:text-2xl font-normal text-ink-deep">Ready to Hang</p>
                  <p className="text-[11px] sm:text-sm text-muted mt-0.5 sm:mt-1 leading-tight">Wall Mounting Hooks</p>
                </div>
                <div className="border-l border-editorial-border pl-2.5 sm:pl-6">
                  <p className="font-serif text-base sm:text-2xl font-normal text-ink-deep">Pan-India</p>
                  <p className="text-[11px] sm:text-sm text-muted mt-0.5 sm:mt-1 leading-tight">Tracked Delivery</p>
                </div>
              </div>
            </div>

            {/* Right Column: Tactile Physical Framing Stage */}
            <div className="lg:col-span-5 xl:col-span-5 flex items-center justify-center">
              <div className="relative mx-auto w-full max-w-[440px] lg:max-w-none">
                {/* Background ambient warm frame mat shadow */}
                <div
                  className="absolute inset-3 -rotate-1 rounded-card bg-surface-cream/80 border border-editorial-border/60 -z-10 shadow-sm"
                  aria-hidden="true"
                />

                {/* The Physical Museum Frame */}
                <div className="relative w-full max-w-[420px] mx-auto aspect-[4/5] p-3.5 sm:p-4 bg-[#18181A] rounded-card shadow-frame transition-transform duration-500 hover:scale-[1.01]">
                  {/* Beveled White Museum Mat Border */}
                  <div className="relative w-full h-full p-4 sm:p-6 bg-[#FCFBF9] ring-1 ring-black/10 flex items-center justify-center shadow-inner">
                    {/* High-Resolution Artwork Window */}
                    <div className="relative w-full h-full overflow-hidden bg-surface-soft shadow-inner">
                      <Image
                        src={HERO_IMAGE}
                        alt="FirstMemoir Collector's Wall Frame — Cristiano Ronaldo signed jersey print"
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 420px"
                        className="object-cover"
                        priority
                        fetchPriority="high"
                      />
                      {/* Subtle Glass Reflection Glare */}
                      <div
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Floating Curated Gallery Label */}
                  <div className="absolute -bottom-4 left-4 sm:-bottom-5 sm:left-6 right-4 sm:right-6 bg-white/95 backdrop-blur-md border border-editorial-border px-4 py-2.5 sm:py-3 rounded-lg shadow-gallery flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-brand" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-medium text-ink-deep leading-tight">
                          Curated Wall Frame
                        </p>
                        <p className="text-[11px] text-muted-soft mt-0.5">
                          8×12″ Wall Hanging • Matte Black
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-brand uppercase tracking-wider bg-brand-tint px-2 py-0.5 rounded">
                      300 GSM
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SHOP BY CATEGORY ─── */}
      <section className="py-20 md:py-28 px-4 md:px-8 max-w-content mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight">Shop by category</h2>
            <p className="mt-3 text-muted text-lg max-w-md">
              Wall frames, poster sets, and handcrafted bookmarks.
            </p>
          </div>
          <Link href="/products" className="text-brand font-medium hover:text-brand-pressed transition-colors underline-offset-4 hover:underline whitespace-nowrap">
            View all →
          </Link>
        </div>

        {/* Dynamic category grid — 2 col on mobile, up to 4 on desktop */}
        <div className={`grid gap-6 md:gap-8 ${
          categoriesToShow.length <= 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-4'
        }`}>
          {categoriesToShow.map((cat) => {
            const tileImg = CATEGORY_TILE_IMAGES[cat.slug] ?? CATEGORY_TILE_FALLBACK;
            const subtitle = CATEGORY_SUBTITLES[cat.slug] ?? '';
            return (
              <Link key={cat.id} href={`/products?category=${cat.slug}`} className="group flex flex-col">
                <div className="relative aspect-[4/5] bg-surface-soft overflow-hidden rounded-sm">
                  <Image
                    src={tileImg}
                    alt={`${cat.name} collection`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                </div>
                <h3 className="mt-5 text-xl font-medium text-ink group-hover:text-brand transition-colors">{cat.name}</h3>
                {subtitle && <p className="text-muted-soft text-sm mt-1">{subtitle}</p>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS ─── */}
      <section className="bg-surface-soft py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight">Our picks</h2>
            <p className="mt-3 text-muted text-lg">A selection from the catalog.</p>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* API unavailable at build time — show a text CTA rather than broken placeholders */
            <div className="text-center py-12">
              <p className="text-muted text-lg mb-6">Explore our full catalog of premium prints.</p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-ink text-white rounded-pill font-medium hover:bg-neutral-800 transition-colors"
              >
                Shop the Collection
              </Link>
            </div>
          )}

          {featuredProducts.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-ink text-ink rounded-pill font-medium hover:bg-ink hover:text-white transition-colors"
              >
                View All Products
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── EDITORIAL PRODUCT STORY ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative aspect-square rounded-sm overflow-hidden">
            <Image
              src={EDITORIAL_IMAGE}
              alt="Motivational quote wall frame"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-start space-y-6">
            <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight leading-tight">
              Premium 300 GSM prints, framed and ready to hang.
            </h2>
            <p className="text-lg text-body leading-relaxed max-w-lg">
              Every frame is printed on heavyweight photographic paper and assembled with care. From motivational quotes to iconic sports moments — find art that speaks to you.
            </p>
            <Link
              href="/products?category=frames"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-ink text-white rounded-pill font-medium hover:bg-neutral-800 transition-colors mt-2"
            >
              Shop Wall Frames
            </Link>
          </div>
        </div>
      </section>

      {/* ─── BRAND / TRUST ─── */}
      <section className="bg-ink text-white py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">Why FirstMemoir</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-12 text-left md:text-center">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">300 GSM Paper</h3>
                <p className="text-white/70 leading-relaxed text-sm">Heavyweight photographic-grade paper for vivid, long-lasting prints.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Hang</h3>
                <p className="text-white/70 leading-relaxed text-sm">Every framed print arrives assembled and ready for your wall.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Pan-India Delivery</h3>
                <p className="text-white/70 leading-relaxed text-sm">Secure packaging and tracked shipping across the country.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative w-full py-28 md:py-36 flex items-center justify-center overflow-hidden bg-surface-soft">
        <Image
          src={CTA_IMAGE}
          alt="Supra car frame"
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-serif text-ink tracking-tight mb-6">
            Find your next piece.
          </h2>
          <p className="text-muted text-lg mb-8 max-w-md">
            Wall frames, posters, and bookmarks — all starting at ₹249.
          </p>
          <Link
            href="/products"
            className="px-10 py-4 bg-brand text-white rounded-pill font-medium text-lg hover:bg-brand-pressed transition-colors"
          >
            Shop the Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
