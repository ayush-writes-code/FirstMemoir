import { products as productsApi } from "@repo/api-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, Award, ShieldCheck } from "lucide-react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductCustomizer } from "@/components/ProductCustomizer";
import { ProductPreviewProvider } from "@/store/ProductPreviewContext";
import { PROTOTYPE_CATALOG } from "@/lib/prototype-data";
import { ProductGallery } from "@/components/products/ProductGallery";
import { PrototypeAddToCart } from "@/components/products/PrototypeAddToCart";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  
  // Check Prototype Catalog First
  const prototypeProduct = PROTOTYPE_CATALOG.find((p) => p.slug === slug);
  if (prototypeProduct) {
    return {
      title: `${prototypeProduct.name} | First Memoir`,
      description: "Order premium prints and wall art from First Memoir.in",
      openGraph: {
        title: prototypeProduct.name,
        images: prototypeProduct.images[0] ? [{ url: prototypeProduct.images[0].url }] : [],
      },
    };
  }

  // Fallback to real API
  const res = await productsApi.getProductBySlug(slug).catch(() => ({ success: false, data: null }));

  if (!res.success || !res.data) {
    return { title: "Product Not Found | First Memoir" };
  }

  const product = res.data;
  return {
    title: `${product.name} | First Memoir`,
    description: product.description ?? `Order a premium personalised ${product.name} from First Memoir.in`,
    openGraph: {
      title: product.name,
      description: product.description ?? "",
      images: product.images?.[0] ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Check Prototype Catalog (Isolated Data Boundary)
  const prototypeProduct = PROTOTYPE_CATALOG.find((p) => p.slug === slug);

  if (prototypeProduct) {
    const primaryCategory = prototypeProduct.categories?.[0];

    return (
      <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-16 pb-32 lg:pb-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left Column — Gallery */}
          <div className="w-full lg:w-3/5 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-112px)]">
            <ProductGallery images={prototypeProduct.images} />
            
            {/* Description (Desktop) */}
            <div className="hidden lg:block mt-12 border-t border-hairline pt-12">
              <h2 className="text-xl font-medium text-ink mb-6">Product Information</h2>
              <div className="text-body font-light leading-relaxed whitespace-pre-wrap max-w-2xl">
                {prototypeProduct.description || "Premium printed wall art on 300 GSM photographic paper. This product is currently in the prototype catalog pending final business verification for dimensions and marketing copy."}
              </div>
            </div>
          </div>

          {/* Right Column — Buy Box */}
          <div className="w-full lg:w-2/5 flex flex-col pt-2 lg:pt-0">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted mb-8">
              <Link href="/products" className="hover:text-ink transition-colors">All Prints</Link>
              {primaryCategory && (
                <>
                  <span className="text-hairline">/</span>
                  <Link href={`/products?category=${primaryCategory.slug}`} className="hover:text-ink transition-colors">
                    {primaryCategory.name}
                  </Link>
                </>
              )}
            </div>

            <h1 className="text-4xl lg:text-5xl font-serif text-ink tracking-tight mb-4 leading-[1.1]">
              {prototypeProduct.name}
            </h1>

            <div className="mb-10">
              {prototypeProduct.is_missing_price ? (
                <p className="text-lg text-muted-soft italic">Price coming soon</p>
              ) : (
                <p className="text-2xl text-ink font-medium tracking-wide">
                  ₹{Number(prototypeProduct.base_price).toLocaleString("en-IN")}
                </p>
              )}
            </div>

            <PrototypeAddToCart 
              isMissingPrice={prototypeProduct.is_missing_price} 
            />

            {/* Factual Information (Verified constraints only) */}
            <div className="mt-12 space-y-4 text-sm">
              <div className="flex justify-between py-3 border-b border-hairline">
                <span className="text-muted">Material</span>
                <span className="text-ink font-medium text-right">300 GSM Photographic Paper</span>
              </div>
              <div className="flex justify-between py-3 border-b border-hairline">
                <span className="text-muted">Origin</span>
                <span className="text-ink font-medium text-right">Made in India</span>
              </div>
              <div className="flex justify-between py-3 border-b border-hairline">
                <span className="text-muted">Dispatch</span>
                <span className="text-ink font-medium text-right">Within 24-48 hours</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-hairline">
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center mb-4 text-ink">
                  <Package size={20} strokeWidth={1} />
                </div>
                <span className="text-xs text-muted">Secure<br/>Packaging</span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center mb-4 text-ink">
                  <Award size={20} strokeWidth={1} />
                </div>
                <span className="text-xs text-muted">Premium<br/>Quality</span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center mb-4 text-ink">
                  <ShieldCheck size={20} strokeWidth={1} />
                </div>
                <span className="text-xs text-muted">Secure<br/>Checkout</span>
              </div>
            </div>

            {/* Description (Mobile) */}
            <div className="lg:hidden mt-12 border-t border-hairline pt-8">
              <h2 className="text-xl font-medium text-ink mb-4">Product Information</h2>
              <div className="text-body font-light leading-relaxed whitespace-pre-wrap">
                {prototypeProduct.description || "Premium printed wall art on 300 GSM photographic paper. This product is currently in the prototype catalog pending final business verification for dimensions and marketing copy."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fallback to Real API (Personalized/Database Products)
  const res = await productsApi.getProductBySlug(slug).catch(() => ({ success: false, data: null }));

  if (!res.success || !res.data) {
    notFound();
  }

  const product = res.data;
  const primaryCategory = product.categories?.[0]?.category;

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 lg:pb-12">
      <ProductPreviewProvider>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="w-full lg:w-3/5 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:pr-2">
            <div>
              <ProductImageGallery
                images={product.images || []}
                productName={product.name}
                productSlug={product.slug}
                mockupMetadata={product.mockup_metadata}
              />
              {product.description && (
                <div className="hidden lg:block mt-12 border-t border-hairline pt-8">
                  <h2 className="text-xl font-semibold text-ink mb-4">Product Details</h2>
                  <div className="text-body leading-relaxed whitespace-pre-wrap">{product.description}</div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-2/5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-6">
              <Link href="/products" className="hover:text-ink transition-colors">All Prints</Link>
              {primaryCategory && (
                <>
                  <span className="text-hairline">/</span>
                  <Link href={`/products?category=${primaryCategory.slug}`} className="hover:text-ink transition-colors">
                    {primaryCategory.name}
                  </Link>
                </>
              )}
            </div>
            <h1 className="text-4xl lg:text-5xl font-serif text-ink tracking-tight mb-2 leading-tight">
              {product.name}
            </h1>
            <p className="text-muted text-base mb-8">
              Starting from <span className="font-medium text-ink">₹{Number(product.base_price).toLocaleString("en-IN")}</span>
            </p>

            <ProductCustomizer product={product} />

            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-hairline">
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink">
                  <Package size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">Secure Packaging</span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink">
                  <Award size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">Quality Guarantee</span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink">
                  <ShieldCheck size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">Secure Checkout</span>
              </div>
            </div>

            {product.description && (
              <div className="lg:hidden mt-12 border-t border-hairline pt-8">
                <h2 className="text-xl font-semibold text-ink mb-4">Product Details</h2>
                <div className="text-body leading-relaxed whitespace-pre-wrap">{product.description}</div>
              </div>
            )}
          </div>
        </div>
      </ProductPreviewProvider>
    </div>
  );
}
