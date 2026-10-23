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
  const hasOptions = Boolean(product.options && product.options.length > 0);

  // Extract strictly verified specifications from provenance metadata
  const confirmedSpecs: { label: string; value: string }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSpecs = (product.manufacturing_metadata as any)?.product_specs;
  if (rawSpecs && typeof rawSpecs === "object") {
    if (rawSpecs.dimensions?.status === "SOURCE_CONFIRMED" && rawSpecs.dimensions.value) {
      confirmedSpecs.push({ label: "Print Dimensions", value: String(rawSpecs.dimensions.value) });
    }
    if (rawSpecs.paper?.status === "SOURCE_CONFIRMED" && rawSpecs.paper.value) {
      confirmedSpecs.push({ label: "Paper Stock", value: String(rawSpecs.paper.value) });
    }
    if (rawSpecs.raw_weight?.status === "SOURCE_CONFIRMED" && rawSpecs.raw_weight.value) {
      confirmedSpecs.push({ label: "Approx. Weight", value: String(rawSpecs.raw_weight.value) });
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 lg:pb-16">
      <ProductPreviewProvider>
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* Left Column: Interactive Visual Showcase (Sticky on Desktop) */}
          <div className="w-full lg:w-[56%] lg:sticky lg:top-28 lg:self-start">
            <ProductImageGallery
              images={product.images || []}
              productName={product.name}
              productSlug={product.slug}
              mockupMetadata={product.mockup_metadata}
            />
          </div>

          {/* Right Column: Editorial Product Narrative & Customization */}
          <div className="w-full lg:w-[44%] space-y-6">
            <div>
              {/* Breadcrumbs / Collection Kicker */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-muted-soft mb-3.5 flex-wrap">
                <Link href="/products" className="hover:text-brand transition-colors">Catalog</Link>
                {primaryCategory && (
                  <>
                    <span className="text-editorial-border">/</span>
                    <Link href={`/products?category=${primaryCategory.slug}`} className="hover:text-brand transition-colors">
                      {primaryCategory.name}
                    </Link>
                  </>
                )}
                <span className="text-editorial-border">/</span>
                <span className="text-ink-deep font-semibold truncate max-w-[220px]">{product.name}</span>
              </nav>

              {/* Editorial Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-serif text-ink-deep font-normal tracking-tight leading-[1.14] mb-3">
                {product.name}
              </h1>

              {/* Authoritative Pricing & Provenance */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2.5">
                  {hasOptions && (
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-soft">
                      Starts from
                    </span>
                  )}
                  <span className="text-3xl font-serif text-ink-deep font-normal tracking-tight">
                    ₹{Number(product.base_price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-soft">
                    Incl. of all taxes • Pan-India delivery
                  </span>
                </div>

                {product.manufacturing_metadata?.provisional_price && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Provisional catalog estimate</span>
                  </div>
                )}

                {product.sku && (
                  <div className="text-[11px] font-mono tracking-wider text-muted-soft uppercase">
                    SKU: {product.sku}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Customizer & Add to Cart */}
            <div className="pt-2">
              <ProductCustomizer product={product} />
            </div>

            {/* Neutral Verified Trust Assurances */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-canvas-warm/80 border border-editorial-border/80 text-center divide-x divide-editorial-border/60">
              <div className="flex flex-col items-center justify-center gap-1 px-1">
                <Package size={17} strokeWidth={1.75} className="text-ink-deep" />
                <span className="text-[11px] font-medium text-ink-deep">Secure Packaging</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-1">
                <Award size={17} strokeWidth={1.75} className="text-ink-deep" />
                <span className="text-[11px] font-medium text-ink-deep">Quality Guarantee</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-1">
                <ShieldCheck size={17} strokeWidth={1.75} className="text-ink-deep" />
                <span className="text-[11px] font-medium text-ink-deep">Encrypted Checkout</span>
              </div>
            </div>

            {/* Archival Notes & Verified Specifications */}
            {(product.description || confirmedSpecs.length > 0) && (
              <div className="pt-6 border-t border-editorial-border/60 space-y-3.5">
                <h2 className="text-base font-serif text-ink-deep font-normal">
                  Archival Details & Specifications
                </h2>
                {product.description && (
                  <div className="text-sm text-body leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </div>
                )}
                {confirmedSpecs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {confirmedSpecs.map((spec) => (
                      <div
                        key={spec.label}
                        className="p-3 rounded-xl bg-canvas-warm/60 border border-editorial-border/60 flex flex-col gap-0.5"
                      >
                        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-soft">
                          {spec.label}
                        </span>
                        <span className="text-xs font-medium text-ink-deep">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ProductPreviewProvider>
    </div>
  );
}
