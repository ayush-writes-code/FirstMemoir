import { products as productsApi } from '@repo/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { FrameSelector } from '@/components/FrameSelector';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await productsApi.getProductBySlug(slug);
  
  if (!res.success || !res.data) {
    return { title: 'Product Not Found' };
  }
  
  return {
    title: res.data.product.name,
    description: res.data.product.description || `Buy ${res.data.product.name} from PrintCraft`,
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

  const { product, frameMaterials } = res.data;
  const primaryCategory = product.categories?.[0]?.category;

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        {/* Left Column - Gallery */}
        <div className="w-full lg:w-3/5">
          <ProductImageGallery images={product.images} productName={product.name} />
          
          {/* Description below gallery on desktop */}
          {product.description && (
            <div className="hidden lg:block mt-12 border-t border-hairline pt-8">
              <h2 className="text-xl font-semibold text-ink mb-4">ProductDto Details</h2>
              <div className="text-body leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Buy Box */}
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
            <p className="text-3xl font-semibold text-brand mb-6">₹{Number(product.base_price).toLocaleString('en-IN')}</p>
            
            <hr className="border-hairline mb-6" />

            <FrameSelector materials={frameMaterials} type="FRAME" label="Choose Frame Style" />
            <FrameSelector materials={frameMaterials} type="GLASS" label="Choose Glass Type" />

            <button className="w-full bg-brand hover:bg-brand-pressed text-white font-medium text-lg rounded-pill h-12 mt-4 transition-colors">
              Customize & Add to Cart
            </button>
            
            <p className="text-sm text-center text-muted mt-4">
              Estimated delivery: 5–7 business days
            </p>

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
                <h2 className="text-xl font-semibold text-ink mb-4">ProductDto Details</h2>
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
