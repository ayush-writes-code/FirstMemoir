import { products as productsApi } from "@repo/api-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, Award, ShieldCheck } from "lucide-react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductCustomizer } from "@/components/ProductCustomizer";
import { ProductPreviewProvider } from "@/store/ProductPreviewContext";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await productsApi.getProductBySlug(slug);

  if (!res.success || !res.data) {
    return { title: "Product Not Found | First Memoir" };
  }

  const product = res.data;
  return {
    title: `${product.name} | First Memoir`,
    description:
      product.description ??
      `Order a premium personalised ${product.name} from First Memoir.in`,
    openGraph: {
      title: product.name,
      description: product.description ?? "",
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
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 lg:pb-12">
      <ProductPreviewProvider>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left Column — Gallery */}
          <div className="w-full lg:w-3/5 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:pr-2">
            <div>
              <ProductImageGallery
                images={product.images}
                productName={product.name}
                productSlug={product.slug}
                mockupMetadata={product.mockup_metadata}
              />

              {/* Description below gallery on desktop */}
              {product.description && (
                <div className="hidden lg:block mt-12 border-t border-hairline pt-8">
                  <h2 className="text-xl font-semibold text-ink mb-4">
                    Product Details
                  </h2>
                  <div className="text-body leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Buy Box */}
          <div className="w-full lg:w-2/5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-6">
              <Link
                href="/products"
                className="hover:text-ink transition-colors"
              >
                All Prints
              </Link>
              {primaryCategory && (
                <>
                  <span className="text-hairline">/</span>
                  <Link
                    href={`/products?category=${primaryCategory.slug}`}
                    className="hover:text-ink transition-colors"
                  >
                    {primaryCategory.name}
                  </Link>
                </>
              )}
            </div>

            <h1 className="text-4xl lg:text-5xl font-serif text-ink tracking-tight mb-2 leading-tight">
              {product.name}
            </h1>

            <p className="text-muted text-base mb-8">
              Starting from{" "}
              <span className="font-medium text-ink">
                ₹{Number(product.base_price).toLocaleString("en-IN")}
              </span>
            </p>

            {/* ProductCustomizer handles option selection, DPI, upload, and Add to Cart */}
            <ProductCustomizer product={product} />

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-hairline">
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink group-hover:scale-105 transition-transform">
                  <Package size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">
                  Secure Packaging
                </span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink group-hover:scale-105 transition-transform">
                  <Award size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">
                  Quality Guarantee
                </span>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-3 text-ink group-hover:scale-105 transition-transform">
                  <ShieldCheck size={18} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-ink">
                  Secure Checkout
                </span>
              </div>
            </div>

            {/* Description on mobile */}
            {product.description && (
              <div className="lg:hidden mt-12 border-t border-hairline pt-8">
                <h2 className="text-xl font-semibold text-ink mb-4">
                  Product Details
                </h2>
                <div className="text-body leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </ProductPreviewProvider>
    </div>
  );
}
