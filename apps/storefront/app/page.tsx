import Image from 'next/image';
import Link from 'next/link';
import { categories as categoriesApi, products as productsApi } from '@/lib/api-client';

// Prevent Next.js from prerendering this page at build time since it relies on an external API
export const dynamic = 'force-dynamic';

// Real catalog images from client-supplied listing data
const CATALOG_IMAGES = {
  hero: '/catalog/frames/football-ronaldo-1.jpg',
  categories: {
    frames: '/catalog/frames/motivation-03-1.jpg',
    posters: '/catalog/posters/ronaldo-split-realmadrid-1.jpg',
    bookmarks: '/catalog/bookmarks/animal-bm1-1.jpg',
  },
  featured: [
    { src: '/catalog/frames/porsche-1.jpg', alt: 'Porsche GT3 RS Wall Frame', label: 'Porsche GT3 RS Frame', price: '₹249' },
    { src: '/catalog/frames/football-mbappe-1.jpg', alt: 'Mbappé Jersey Frame', label: 'Football Legends Frame', price: '₹299' },
    { src: '/catalog/posters/carsplit-lambo-1.jpg', alt: 'Lamborghini Split Poster', label: 'Car Split Poster Set', price: '₹299' },
    { src: '/catalog/posters/anime-pack12-1.jpg', alt: 'Anime Poster Pack', label: 'Anime Mix Poster Pack', price: null },
  ],
  editorial: '/catalog/frames/motivation-09-1.jpg',
  collection: '/catalog/frames/cars-supra-1.jpg',
};

export default async function Home() {
  let categoriesRes;

  try {
    categoriesRes = await categoriesApi.getCategories();
  } catch (error) {
    console.error("Failed to fetch catalog data for homepage", error);
    categoriesRes = { success: false };
  }

  const categories = categoriesRes?.success ? categoriesRes.data || [] : [];

  return (
    <div className="flex flex-col">

      {/* ─── HERO ─── */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center bg-ink overflow-hidden">
        <Image
          src={CATALOG_IMAGES.hero}
          alt="Premium wall frame featuring Cristiano Ronaldo signed jersey"
          fill
          sizes="100vw"
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-[1.1]">
            Art for your walls.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/85 font-light max-w-xl">
            Premium framed prints, posters, and wall art — crafted on 300 GSM photographic paper and delivered across India.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="px-10 py-4 bg-white text-ink rounded-pill font-medium text-lg hover:bg-neutral-100 transition-colors"
            >
              Shop All
            </Link>
            <Link
              href="/products?category=frames-8x12"
              className="px-10 py-4 bg-white/10 text-white border border-white/30 rounded-pill font-medium text-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Explore Frames
            </Link>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Frames */}
          <Link href="/products?category=frames-8x12" className="group flex flex-col">
            <div className="relative aspect-[4/5] bg-surface-soft overflow-hidden rounded-sm">
              <Image
                src={CATALOG_IMAGES.categories.frames}
                alt="Wall Frames collection"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
            <h3 className="mt-5 text-xl font-medium text-ink group-hover:text-brand transition-colors">Wall Frames</h3>
            <p className="text-muted-soft text-sm mt-1">8×12 inch framed prints</p>
          </Link>

          {/* Posters */}
          <Link href="/products?category=posters" className="group flex flex-col">
            <div className="relative aspect-[4/5] bg-surface-soft overflow-hidden rounded-sm">
              <Image
                src={CATALOG_IMAGES.categories.posters}
                alt="Posters & Wall Art collection"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
            <h3 className="mt-5 text-xl font-medium text-ink group-hover:text-brand transition-colors">Posters & Wall Art</h3>
            <p className="text-muted-soft text-sm mt-1">Split designs, collage kits & more</p>
          </Link>

          {/* Bookmarks */}
          <Link href="/products?category=bookmarks" className="group flex flex-col">
            <div className="relative aspect-[4/5] bg-surface-soft overflow-hidden rounded-sm">
              <Image
                src={CATALOG_IMAGES.categories.bookmarks}
                alt="Bookmarks collection"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
            <h3 className="mt-5 text-xl font-medium text-ink group-hover:text-brand transition-colors">Bookmarks</h3>
            <p className="text-muted-soft text-sm mt-1">300 GSM themed bookmark sets</p>
          </Link>
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS ─── */}
      <section className="bg-surface-soft py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight">Our picks</h2>
            <p className="mt-3 text-muted text-lg">A selection from the catalog.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {CATALOG_IMAGES.featured.map((item, idx) => (
              <Link key={idx} href="/products" className="group flex flex-col">
                <div className="relative aspect-square bg-white overflow-hidden rounded-sm">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm md:text-base font-medium text-ink group-hover:text-brand transition-colors leading-snug">{item.label}</h3>
                  {item.price ? (
                    <p className="text-sm text-muted mt-1">{item.price}</p>
                  ) : (
                    <p className="text-sm text-muted-soft mt-1 italic">Price coming soon</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EDITORIAL PRODUCT STORY ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative aspect-square rounded-sm overflow-hidden">
            <Image
              src={CATALOG_IMAGES.editorial}
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
              href="/products?category=frames-8x12"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-ink text-white rounded-pill font-medium hover:bg-neutral-800 transition-colors mt-2"
            >
              Shop Wall Frames
            </Link>
          </div>
        </div>
      </section>

      {/* ─── COLLECTIONS STRIP ─── */}
      <section className="bg-surface-cream py-20 md:py-28">
        <div className="max-w-content mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight text-center mb-14">Collections</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
            {[
              { name: 'Football Legends', href: '/products?category=frames-8x12', img: CATALOG_IMAGES.hero },
              { name: 'Motivational Quotes', href: '/products?category=frames-8x12', img: CATALOG_IMAGES.editorial },
              { name: 'Anime', href: '/products?category=posters', img: CATALOG_IMAGES.featured[3]!.src },
              { name: 'Supercars', href: '/products?category=posters', img: CATALOG_IMAGES.collection },
            ].map((col, idx) => (
              <Link key={idx} href={col.href} className="group flex flex-col items-center">
                <div className="relative w-full aspect-square rounded-full overflow-hidden bg-surface-soft mb-4">
                  <Image
                    src={col.img}
                    alt={col.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <h3 className="text-sm md:text-base font-medium text-ink group-hover:text-brand transition-colors">{col.name}</h3>
              </Link>
            ))}
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
                <h4 className="text-lg font-medium text-brand mb-2">300 GSM Paper</h4>
                <p className="text-white/70 leading-relaxed text-sm">Heavyweight photographic-grade paper for vivid, long-lasting prints.</p>
              </div>
              <div>
                <h4 className="text-lg font-medium text-brand mb-2">Ready to Hang</h4>
                <p className="text-white/70 leading-relaxed text-sm">Every framed print arrives assembled and ready for your wall.</p>
              </div>
              <div>
                <h4 className="text-lg font-medium text-brand mb-2">Pan-India Delivery</h4>
                <p className="text-white/70 leading-relaxed text-sm">Secure packaging and tracked shipping across the country.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative w-full py-28 md:py-36 flex items-center justify-center overflow-hidden bg-surface-soft">
        <Image
          src={CATALOG_IMAGES.collection}
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
