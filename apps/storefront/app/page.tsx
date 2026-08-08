import Image from 'next/image';
import Link from 'next/link';
import { categories as categoriesApi, products as productsApi } from '@repo/api-client';
import { ProductCard } from '@/components/ProductCard';

export default async function Home() {
  const [categoriesRes, productsRes] = await Promise.all([
    categoriesApi.getCategories(),
    productsApi.getProducts({ limit: 8 })
  ]);

  const categories = categoriesRes.success ? categoriesRes.data || [] : [];
  const products = productsRes.success ? productsRes.data || [] : [];

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="w-full bg-surface-soft">
        <div className="max-w-content mx-auto px-4 md:px-8 py-16 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left space-y-6">
            <p className="text-sm font-semibold tracking-widest text-muted uppercase">PREMIUM QUALITY PRINTS</p>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink leading-tight">Turn your memories into art</h1>
            <p className="text-lg text-body max-w-lg mx-auto md:mx-0">
              Custom photo prints, framed photos, and premium posters. Crafted with care, delivered across India.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start pt-4">
              <Link href="/products" className="w-full sm:w-auto px-8 py-3 bg-brand text-white rounded-pill font-medium hover:bg-brand-pressed transition-colors">
                Shop Prints
              </Link>
              <Link href="/how-it-works" className="w-full sm:w-auto px-8 py-3 border border-border-strong text-ink rounded-pill font-medium hover:bg-hairline transition-colors">
                How It Works
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full aspect-video md:aspect-[4/3] relative rounded-card overflow-hidden">
            <Image 
              src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200" 
              alt="Beautiful framed prints" 
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Categories Strip */}
      {categories.length > 0 && (
        <section className="max-w-content mx-auto px-4 md:px-8 w-full">
          <h2 className="text-2xl font-semibold text-ink mb-6">Shop by Category</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {categories.slice(0, 6).map((category) => (
              <Link 
                key={category.id} 
                href={`/products?category=${category.slug}`}
                className="whitespace-nowrap bg-surface-soft text-ink rounded-pill px-6 py-3 text-sm font-semibold hover:bg-hairline transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-content mx-auto px-4 md:px-8 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-ink">Featured Prints</h2>
          <p className="text-muted mt-1">Handpicked for your walls</p>
        </div>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-surface-soft rounded-card">
            <h3 className="text-xl font-medium text-ink mb-2">We're setting up our catalog.</h3>
            <p className="text-muted mb-6">Check back soon!</p>
            <Link href="/" className="px-6 py-2 bg-brand text-white rounded-pill font-medium hover:bg-brand-pressed transition-colors">
              Go Home
            </Link>
          </div>
        )}
      </section>

      {/* Trust Band */}
      <section className="bg-surface-cream">
        <div className="max-w-content mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Premium Materials</h3>
            <p className="text-body max-w-xs">Archival inks and museum-quality substrates</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🇮🇳</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Made in India</h3>
            <p className="text-body max-w-xs">Crafted by expert artisans with love</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Fast Delivery</h3>
            <p className="text-body max-w-xs">Delivered in 5–7 business days</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-content mx-auto px-4 md:px-8 py-8 w-full text-center">
        <h2 className="text-3xl font-semibold text-ink mb-12">Why thousands choose us</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="w-16 h-16 bg-surface-soft rounded-full mx-auto flex items-center justify-center mb-6 text-2xl font-bold text-brand">1</div>
            <h3 className="font-medium text-ink mb-2">Upload your photo</h3>
            <p className="text-muted">High resolution support from phone or computer.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-surface-soft rounded-full mx-auto flex items-center justify-center mb-6 text-2xl font-bold text-brand">2</div>
            <h3 className="font-medium text-ink mb-2">Customize it</h3>
            <p className="text-muted">Pick your frame, glass, and matting options.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-surface-soft rounded-full mx-auto flex items-center justify-center mb-6 text-2xl font-bold text-brand">3</div>
            <h3 className="font-medium text-ink mb-2">We craft & ship</h3>
            <p className="text-muted">Hand-assembled and delivered securely to you.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
