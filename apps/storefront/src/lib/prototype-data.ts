import { StorefrontProduct } from '../types';

export const PROTOTYPE_CATEGORIES = [
  { id: 'cat-frames', slug: 'frames', name: 'Wall Frames' },
  { id: 'cat-posters', slug: 'posters', name: 'Posters & Wall Art' },
  { id: 'cat-bookmarks', slug: 'bookmarks', name: 'Bookmarks' },
];

export const PROTOTYPE_CATALOG: StorefrontProduct[] = [
  {
    id: 'prod-porsche',
    slug: 'porsche-gt3-rs-frame',
    name: 'Porsche GT3 RS Wall Frame',
    base_price: '249', // Verified
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-1', url: '/catalog/frames/porsche-1.jpg', alt_text: 'Porsche GT3 RS', order: 0 }],
    created_at: '2026-09-20T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-ronaldo-frame',
    slug: 'cristiano-ronaldo-jersey-frame',
    name: 'Cristiano Ronaldo Jersey Frame',
    base_price: '299', // Verified
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-2', url: '/catalog/frames/football-ronaldo-1.jpg', alt_text: 'Ronaldo', order: 0 }],
    created_at: '2026-09-19T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-mbappe-frame',
    slug: 'kylian-mbappe-jersey-frame',
    name: 'Kylian Mbappé Jersey Frame',
    base_price: '299', // Verified
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-3', url: '/catalog/frames/football-mbappe-1.jpg', alt_text: 'Mbappe', order: 0 }],
    created_at: '2026-09-18T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-motivation-03',
    slug: 'hustle-hard-motivation-frame',
    name: 'Hustle Hard Motivation Frame',
    base_price: '299', // Verified
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-4', url: '/catalog/frames/motivation-03-1.jpg', alt_text: 'Motivation 03', order: 0 }],
    created_at: '2026-09-15T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-motivation-09',
    slug: 'focus-motivation-frame',
    name: 'Focus Motivation Frame',
    base_price: '299', // Verified
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-5', url: '/catalog/frames/motivation-09-1.jpg', alt_text: 'Motivation 09', order: 0 }],
    created_at: '2026-09-14T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-cars-supra',
    slug: 'toyota-supra-wall-frame',
    name: 'Toyota Supra Wall Frame',
    base_price: '0', 
    is_missing_price: true,
    categories: [{ id: 'cat-frames', name: 'Wall Frames', slug: 'frames' }],
    images: [{ id: 'img-6', url: '/catalog/frames/cars-supra-1.jpg', alt_text: 'Supra', order: 0 }],
    created_at: '2026-09-16T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-ronaldo-split',
    slug: 'ronaldo-real-madrid-split-poster',
    name: 'Cristiano Ronaldo Real Madrid Split Poster',
    base_price: '299', // Verified
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-7', url: '/catalog/posters/ronaldo-split-realmadrid-1.jpg', alt_text: 'Ronaldo Split', order: 0 }],
    created_at: '2026-09-17T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-anime-12',
    slug: 'anime-mix-poster-pack-12',
    name: 'Anime Mix Poster Pack (Set of 12)',
    base_price: '0', // Unverified placeholder
    is_missing_price: true,
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-8', url: '/catalog/posters/anime-pack12-1.jpg', alt_text: 'Anime Pack 12', order: 0 }],
    created_at: '2026-09-10T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-carsplit-lambo',
    slug: 'lamborghini-split-poster-set',
    name: 'Lamborghini Pink Split Poster Set',
    base_price: '0', // Unverified placeholder
    is_missing_price: true,
    categories: [{ id: 'cat-posters', name: 'Posters', slug: 'posters' }],
    images: [{ id: 'img-9', url: '/catalog/posters/carsplit-lambo-1.jpg', alt_text: 'Lambo Split', order: 0 }],
    created_at: '2026-09-13T00:00:00Z',
    is_prototype: true,
  },
  {
    id: 'prod-animal-bm1',
    slug: 'animal-theme-bookmarks-set',
    name: 'Animal Theme Bookmarks (Set of 5)',
    base_price: '0', // Unverified placeholder
    is_missing_price: true,
    categories: [{ id: 'cat-bookmarks', name: 'Bookmarks', slug: 'bookmarks' }],
    images: [{ id: 'img-10', url: '/catalog/bookmarks/animal-bm1-1.jpg', alt_text: 'Animal Bookmarks', order: 0 }],
    created_at: '2026-09-12T00:00:00Z',
    is_prototype: true,
  },
];
