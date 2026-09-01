import Image from 'next/image';
import Link from 'next/link';
import { categories as categoriesApi, products as productsApi } from '@repo/api-client';
import { HeroVideoRotation } from '../src/components/HeroVideoRotation';

// Prevent Next.js from prerendering this page at build time since it relies on an external API
export const dynamic = 'force-dynamic';

const TEMPORARY_ASSETS = {
  hero: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2000&auto=format&fit=crop",
  categoryPlaceholders: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=80&w=800&auto=format&fit=crop"
  ],
  productStory: "https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=1200&auto=format&fit=crop",
  howItWorks: [
    "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?q=80&w=600&auto=format&fit=crop"
  ],
  craftsmanship: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?q=80&w=1000&auto=format&fit=crop",
  finalCta: "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2000&auto=format&fit=crop"
};

export default async function Home() {
  let categoriesRes;
  let productsRes;

  try {
    [categoriesRes, productsRes] = await Promise.all([
      categoriesApi.getCategories(),
      productsApi.getProducts({ limit: 4 })
    ]);
  } catch (error) {
    console.error("Failed to fetch catalog data for homepage", error);
    categoriesRes = { success: false };
    productsRes = { success: false };
  }

  const categories = categoriesRes?.success ? categoriesRes.data || [] : [];
  const products = productsRes?.success ? productsRes.data || [] : [];

  return (
    <div className="flex flex-col">
      {/* SECTION 1 — HERO */}
      {/* Immersive, editorial hero. Large photography, emotional headline. */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center bg-surface-soft">
        <HeroVideoRotation fallbackPoster={TEMPORARY_ASSETS.hero} />
        {/* Subtle overlay to ensure text readability while maintaining an editorial feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/40 mix-blend-multiply" />
        
        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-3xl mt-16 md:mt-0">
          <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight drop-shadow-sm leading-[1.1]">
            Your memories deserve a place on the wall.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 font-light max-w-xl drop-shadow-sm">
            Museum-quality framing, handcrafted to turn your favorite photos into timeless art.
          </p>
          <Link 
            href="/products" 
            className="mt-10 px-10 py-4 bg-white text-ink rounded-pill font-medium text-lg hover:bg-neutral-100 transition-colors shadow-sm"
          >
            Start Creating
          </Link>
        </div>
      </section>

      {/* SECTION 2 — DISCOVER */}
      {/* Curated product discovery rather than a generic grid */}
      <section className="py-24 px-4 md:px-8 max-w-content mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight">Find your frame.</h2>
            <p className="mt-4 text-muted text-lg max-w-md">
              From classic gallery borders to modern edge-to-edge prints. Explore our collection of premium styles.
            </p>
          </div>
          <Link href="/products" className="text-brand font-medium hover:text-brand-pressed transition-colors underline-offset-4 hover:underline">
            View entire catalog
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.slice(0, 3).map((category, idx) => {
              const imageSrc = TEMPORARY_ASSETS.categoryPlaceholders[idx % TEMPORARY_ASSETS.categoryPlaceholders.length]!;
              return (
                <Link key={category.id} href={`/products?category=${category.slug}`} className="group flex flex-col">
                  <div className="relative aspect-[4/5] bg-surface-soft overflow-hidden mb-6 rounded-sm">
                    <Image 
                      src={imageSrc} 
                      alt={category.name} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-xl font-medium text-ink group-hover:text-brand transition-colors">{category.name}</h3>
                  <p className="text-muted mt-2 text-sm">Shop collection</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface-soft rounded-sm">
            <p className="text-muted text-lg">Our catalog is currently being updated.</p>
          </div>
        )}
      </section>

      {/* SECTION 3 — PRODUCT STORY */}
      {/* Editorial layout highlighting a featured product or concept */}
      <section className="bg-surface-cream w-full py-24">
        <div className="max-w-content mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative aspect-square md:aspect-[4/3] rounded-sm overflow-hidden">
            <Image 
              src={TEMPORARY_ASSETS.productStory} 
              alt="Close up of premium framing materials" 
              fill 
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="order-1 lg:order-2 flex flex-col items-start space-y-6">
            <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight leading-tight">
              Made to turn the photos you love into something you can live with.
            </h2>
            <p className="text-lg text-body leading-relaxed max-w-lg">
              Every print is crafted using archival-grade inks and museum-quality paper, ensuring your memories never fade. Assembled by hand, ready to hang.
            </p>
            <Link 
              href="/products" 
              className="inline-flex items-center justify-center px-8 py-3 bg-ink text-white rounded-pill font-medium hover:bg-neutral-800 transition-colors mt-4"
            >
              Explore the collection
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4 — HOW IT BECOMES YOURS */}
      {/* Simple visual stages */}
      <section className="py-24 px-4 md:px-8 max-w-content mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight">How it becomes yours.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          <div className="flex flex-col items-center text-center group">
            <div className="relative w-full aspect-square mb-8 bg-surface-soft rounded-full overflow-hidden flex items-center justify-center p-8">
               <Image src={TEMPORARY_ASSETS.howItWorks[0]!} alt="Choose photo" fill className="object-cover opacity-80 mix-blend-multiply group-hover:scale-105 transition-transform duration-700" unoptimized />
            </div>
            <div className="text-brand font-medium tracking-widest text-sm mb-3">01</div>
            <h3 className="text-xl font-medium text-ink mb-3">Choose your photo</h3>
            <p className="text-muted leading-relaxed max-w-xs">Upload directly from your phone or computer. High resolution supported.</p>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="relative w-full aspect-square mb-8 bg-surface-soft rounded-full overflow-hidden flex items-center justify-center p-8">
               <Image src={TEMPORARY_ASSETS.howItWorks[1]!} alt="Make it yours" fill className="object-cover opacity-80 mix-blend-multiply group-hover:scale-105 transition-transform duration-700" unoptimized />
            </div>
            <div className="text-brand font-medium tracking-widest text-sm mb-3">02</div>
            <h3 className="text-xl font-medium text-ink mb-3">Make it yours</h3>
            <p className="text-muted leading-relaxed max-w-xs">Select your size, frame style, and matting to perfectly match your space.</p>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="relative w-full aspect-square mb-8 bg-surface-soft rounded-full overflow-hidden flex items-center justify-center p-8">
               <Image src={TEMPORARY_ASSETS.howItWorks[2]!} alt="We make it real" fill className="object-cover opacity-80 mix-blend-multiply group-hover:scale-105 transition-transform duration-700" unoptimized />
            </div>
            <div className="text-brand font-medium tracking-widest text-sm mb-3">03</div>
            <h3 className="text-xl font-medium text-ink mb-3">We make it real</h3>
            <p className="text-muted leading-relaxed max-w-xs">Expertly printed, assembled by hand, and delivered securely to your door.</p>
          </div>
        </div>
      </section>

      {/* SECTION 5 — MATERIAL / CRAFT / TRUST */}
      {/* Restrained "Why FirstMemoir" without fabricated metrics */}
      <section className="bg-ink text-white py-24">
        <div className="max-w-content mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-serif tracking-tight">Crafted for permanence.</h2>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-brand mb-2">Archival Quality</h4>
                  <p className="text-white/70 leading-relaxed">We use pigment-based inks and acid-free papers so your prints resist fading and discoloration for generations.</p>
                </div>
                <div className="w-12 h-px bg-white/20"></div>
                <div>
                  <h4 className="text-lg font-medium text-brand mb-2">Hand Assembled</h4>
                  <p className="text-white/70 leading-relaxed">Every frame is cut, joined, and inspected by hand in our workshop to ensure a flawless finish.</p>
                </div>
                <div className="w-12 h-px bg-white/20"></div>
                <div>
                  <h4 className="text-lg font-medium text-brand mb-2">Ready to Hang</h4>
                  <p className="text-white/70 leading-relaxed">Your piece arrives fully finished with hanging hardware pre-installed. No stress, just beautiful walls.</p>
                </div>
              </div>
            </div>
            <div className="relative aspect-[3/4] md:aspect-square w-full rounded-sm overflow-hidden bg-neutral-900">
               <Image 
                  src={TEMPORARY_ASSETS.craftsmanship} 
                  alt="Craftsmanship detail"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover opacity-80"
                  unoptimized
                />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FINAL CTA */}
      {/* Large visual closing section */}
      <section className="relative w-full py-32 flex items-center justify-center overflow-hidden bg-surface-soft">
        {/* Abstract/soft background image */}
        <Image 
          src={TEMPORARY_ASSETS.finalCta} 
          alt="Abstract gallery wall"
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          unoptimized
        />
        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl">
          <h2 className="text-5xl md:text-6xl font-serif text-ink tracking-tight mb-8">
            Make a memory worth keeping.
          </h2>
          <Link 
            href="/products" 
            className="px-10 py-4 bg-brand text-white rounded-pill font-medium text-lg hover:bg-brand-pressed transition-colors shadow-sm"
          >
            Start Creating
          </Link>
        </div>
      </section>
    </div>
  );
}
