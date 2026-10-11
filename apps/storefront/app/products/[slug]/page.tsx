import { ShieldCheck, Package, Award } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { products as productsApi } from "@/lib/api-client";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductCustomizer } from "@/components/ProductCustomizer";
import { ProductPreviewProvider } from "@/store/ProductPreviewContext";
import type { Metadata } from "next";
import { PRODUCT_SLUG_ALIASES } from "@/config/slug-aliases";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSlug = PRODUCT_SLUG_ALIASES[slug] || slug;

  // Real API Product
  const res = await productsApi.getProductBySlug(resolvedSlug).catch(() => ({ success: false, data: null }));
  if (res.success && res.data) {
    return {
      title: `${res.data.name} | FirstMemoir`,
      description: res.data.description,
    };
  }

  return {
    title: "Product Not Found | FirstMemoir",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Seamlessly redirect legacy/prototype product slugs to their canonical catalogue counterparts
  if (PRODUCT_SLUG_ALIASES[slug]) {
    redirect(`/products/${PRODUCT_SLUG_ALIASES[slug]}`);
  }

  // Fetch real API product
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
            <div className="mb-8">
              <p className="text-muted text-base">
                Starting from <span className="font-medium text-ink">₹{Number(product.base_price).toLocaleString("en-IN")}</span>
              </p>
              {product.manufacturing_metadata?.provisional_price && (
                <div className="mt-2">
                  <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Provisional Estimate
                  </span>
                  <p className="text-xs text-muted mt-1">
                    Initial estimated selling price — editable via catalogue/admin.
                  </p>
                </div>
              )}
              {product.sku && (
                <p className="text-xs text-muted-soft mt-1.5 font-mono">
                  SKU: {product.sku}
                </p>
              )}
            </div>

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
