import { products as productsApi } from '@repo/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductCustomizer } from '@/components/ProductCustomizer';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await productsApi.getProductBySlug(slug);

  if (!res.success || !res.data) {
    return { title: 'Product Not Found | First Memoir' };
  }

  const product = res.data;
  return {
    title: `${product.name} | First Memoir`,
    description: product.description ?? `Order a premium personalised ${product.name} from First Memoir.in`,
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await productsApi.getProductBySlug(slug);

  if (!res.success || !res.data) {
    notFound();
  }

  const product = res.data;
  const primaryCategory = product.categories?.[0]?.category;

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

        {/* Left Column — Gallery */}
        <div className="w-full lg:w-3/5">
          <ProductImageGallery images={product.images} productName={product.name} />

          {/* Description below gallery on desktop */}
          {product.description && (
            <div className="hidden lg:block mt-12 border-t border-hairline pt-8">
              <h2 className="text-xl font-semibold text-ink mb-4">Product Details</h2>
              <div className="text-body leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Buy Box */}
        <div className="w-full lg:w-2/5">
          <div className="sticky top-28">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted mb-4">
              <Link href="/products" className="hover:text-brand transition-colors">All Prints</Link>
              {primaryCategory && (
                <>
                  <span>›</span>
                  <Link href={`/products?category=${primaryCategory.slug}`} className="hover:text-brand transition-colors">
                    {primaryCategory.name}
                  </Link>
                </>
              )}
            </div>

            <h1 className="text-3xl font-semibold text-ink mb-2">{product.name}</h1>

            {/* ProductCustomizer handles option selection, DPI, upload, and Add to Cart */}
            <ProductCustomizer product={product} />

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-hairline">
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">📦</span>
                <span className="text-xs font-medium text-ink">Secure Packaging</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">⭐</span>
                <span className="text-xs font-medium text-ink">Quality Guarantee</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">🔄</span>
                <span className="text-xs font-medium text-ink">Free Returns</span>
              </div>
            </div>

            {/* Description on mobile */}
            {product.description && (
              <div className="lg:hidden mt-12 border-t border-hairline pt-8">
                <h2 className="text-xl font-semibold text-ink mb-4">Product Details</h2>
                <div className="text-body leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
