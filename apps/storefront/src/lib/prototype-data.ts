import { StorefrontProduct } from '../types';

export const IS_PROTOTYPE_ENABLED = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const RAW_CATEGORIES = [
  { id: 'cat-frames', slug: 'frames', name: 'Wall Frames' },
  { id: 'cat-posters', slug: 'posters', name: 'Posters & Wall Art' },
  { id: 'cat-bookmarks', slug: 'bookmarks', name: 'Bookmarks' },
];

const RAW_CATALOG: StorefrontProduct[] = [
  {
    id: 'prod-porsche',
    slug: 'porsche-gt3-rs-frame',
    name: 'Porsche GT3 RS Wall Frame',
    sku: 'FM-FRM-POR-GT3RS',
    base_price: '249', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-1', url: '/catalog/frames/porsche-1.jpg', alt_text: 'Porsche GT3 RS Wall Frame', order: 0 }],
    description: 'Set of 3 - Porsche GT3 RS Wall Poster Frame | 8x12 inch (A4 Size). Printed on 300 GSM archival photographic paper with high-clarity protective acrylic.',
    created_at: '2026-09-20T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-ronaldo-frame',
    slug: 'cristiano-ronaldo-jersey-frame',
    name: 'Cristiano Ronaldo Jersey Frame',
    sku: 'FM-FRM-FBL-RONALDO',
    base_price: '299', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-2', url: '/catalog/frames/football-ronaldo-1.jpg', alt_text: 'Cristiano Ronaldo Jersey Frame', order: 0 }],
    description: 'Cristiano Ronaldo signed jersey wall poster frame (8x12 inch). World Cup special series printed on 300 GSM photographic paper.',
    created_at: '2026-09-19T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-mbappe-frame',
    slug: 'kylian-mbappe-jersey-frame',
    name: 'Kylian Mbappé Jersey Frame',
    sku: 'FM-FRM-FBL-MBAPPE',
    base_price: '299', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-3', url: '/catalog/frames/football-mbappe-1.jpg', alt_text: 'Kylian Mbappé Jersey Frame', order: 0 }],
    description: 'Kylian Mbappé signed jersey wall poster frame (8x12 inch). World Cup special series printed on 300 GSM photographic paper.',
    created_at: '2026-09-18T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-motivation-03',
    slug: 'hustle-hard-motivation-frame',
    name: 'Hustle Hard Motivation Frame',
    sku: 'FM-FRM-MOT-03',
    base_price: '299', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-4', url: '/catalog/frames/motivation-03-1.jpg', alt_text: 'Hustle Hard Motivation Frame', order: 0 }],
    description: 'Wall Framed Poster (8x12 inch) featuring Motivational Quote design. Printed on 300 GSM photographic paper with lightweight durable frame.',
    created_at: '2026-09-15T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-motivation-09',
    slug: 'focus-motivation-frame',
    name: 'Focus Motivation Frame',
    sku: 'FM-FRM-MOT-09',
    base_price: '299', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-5', url: '/catalog/frames/motivation-09-1.jpg', alt_text: 'Focus Motivation Frame', order: 0 }],
    description: 'Wall Framed Poster (8x12 inch) featuring Focus Motivational design. Printed on 300 GSM photographic paper with lightweight durable frame.',
    created_at: '2026-09-14T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-cars-supra',
    slug: 'toyota-supra-wall-frame',
    name: 'Toyota Supra Wall Frame',
    sku: 'FM-FRM-FFC-SUPRA',
    base_price: '299', // Provisional estimated price (benchmark: all 8x12 frames ₹299; editable via admin)
    is_provisional_price: true,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-6', url: '/catalog/frames/cars-supra-1.jpg', alt_text: 'Toyota Supra Wall Frame', order: 0 }],
    description: 'Iconic Fast & Furious Toyota Supra 8x12 inch framed wall art. Printed on 300 GSM archival paper with modern frame moulding.',
    created_at: '2026-09-16T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-ronaldo-split',
    slug: 'ronaldo-real-madrid-split-poster',
    name: 'Cristiano Ronaldo Real Madrid Split Poster',
    sku: 'FM-PST-SPL-RONALDO-RM',
    base_price: '299', // Verified from source catalogue
    is_provisional_price: false,
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-7', url: '/catalog/posters/ronaldo-split-realmadrid-1.jpg', alt_text: 'Cristiano Ronaldo Real Madrid Split Poster', order: 0 }],
    description: 'Set of 3 - Cristiano Ronaldo Split Design Posters | Full Size 36x18 inch (12x18 inch per panel). Printed on 170 GSM fine art paper, unframed.',
    created_at: '2026-09-17T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-anime-12',
    slug: 'anime-mix-poster-pack-12',
    name: 'Anime Mix Poster Pack (Set of 12)',
    sku: 'FM-PST-ANI-12',
    base_price: '199', // Provisional estimated price (benchmark: 12-pack mini prints, MRP ₹599; editable via admin)
    is_provisional_price: true,
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-8', url: '/catalog/posters/anime-pack12-1.jpg', alt_text: 'Anime Mix Poster Pack (Set of 12)', order: 0 }],
    description: 'Anime Universe: Anime poster Set of 12 Mix Anime Wall Posters for room decor (12x4.5 inch). Printed on 300 GSM photographic paper, unframed.',
    created_at: '2026-09-10T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-carsplit-lambo',
    slug: 'lamborghini-split-poster-set',
    name: 'Lamborghini Pink Split Poster Set',
    sku: 'FM-PST-SPL-LAMBO-PNK',
    base_price: '299', // Provisional estimated price (benchmark: 3-piece split poster standard ₹299, MRP ₹599; editable via admin)
    is_provisional_price: true,
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-9', url: '/catalog/posters/carsplit-lambo-1.jpg', alt_text: 'Lamborghini Pink Split Poster Set', order: 0 }],
    description: 'Pack of 3 - Lamborghini Super Car Split Poster Set (12x18 inch each, 36x18 inch display). Printed on 170 GSM photographic paper, unframed.',
    created_at: '2026-09-13T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-animal-bm1',
    slug: 'animal-theme-bookmarks-set',
    name: 'Animal Theme Bookmarks (Set of 10)',
    sku: 'FM-BKM-ANM-01',
    base_price: '149', // Provisional estimated price (benchmark: 10-piece bookmark pack, MRP ₹499; editable via admin)
    is_provisional_price: true,
    categories: [{ id: 'cat-bookmarks', name: 'Bookmarks', slug: 'bookmarks' }],
    images: [{ id: 'img-10', url: '/catalog/bookmarks/animal-bm1-1.jpg', alt_text: 'Animal Theme Bookmarks (Set of 10)', order: 0 }],
    description: 'Bookmarks For Animal Lovers (Set Of 10 Pcs, 21x6 cm). Vibrant double-sided prints on durable 300 GSM coated cardstock.',
    created_at: '2026-09-12T00:00:00Z',
    is_prototype: true,
  },
];

export const PROTOTYPE_CATEGORIES = IS_PROTOTYPE_ENABLED ? RAW_CATEGORIES : [];
export const PROTOTYPE_CATALOG: StorefrontProduct[] = IS_PROTOTYPE_ENABLED ? RAW_CATALOG : [];
