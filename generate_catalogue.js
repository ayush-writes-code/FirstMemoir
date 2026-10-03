import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const products = [];

// 1. F&F cars (8)
const ffCars = ['Camaro', 'Eclipse', 'Lancer', 'Mazda', 'S2000', 'Silvia', 'Skyline', 'Supra'];
ffCars.forEach(car => {
  products.push({
    name: `Fast & Furious ${car} Frame`,
    slug: slugify(`ff-${car}-frame`),
    sku: `FM-FRM-FFC-${car.toUpperCase()}`,
    desc: `Iconic Fast & Furious ${car} 8x12 inch framed wall art. Printed on 300 GSM archival paper with modern frame moulding.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/ffc-${slugify(car)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      packaging_profile: 'Profile A',
      dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
      weight: { value: 0.45, unit: 'kg' },
    }
  });
});

// 2. Football jerseys (10)
const fbPlayers = ['Ronaldo', 'Beckham', 'Ibrahimovic', 'Mbappe', 'Messi', 'Neymar', 'Pessi', 'Ronaldinho', 'Suarez', 'Van Dijk'];
fbPlayers.forEach(player => {
  products.push({
    name: `${player} Jersey Frame`,
    slug: slugify(`${player}-jersey-frame`),
    sku: `FM-FRM-FBL-${player.toUpperCase().replace(/\s+/g, '')}`,
    desc: `${player} signed jersey wall poster frame (8x12 inch). World Cup special series printed on 300 GSM photographic paper.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/football-${slugify(player)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      packaging_profile: 'Profile A',
      dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
      weight: { value: 0.45, unit: 'kg' },
    }
  });
});

// 3. Motivations Quotes (30)
for (let i = 1; i <= 30; i++) {
  const num = i.toString().padStart(2, '0');
  products.push({
    name: `Motivation Quote Frame ${num}`,
    slug: slugify(`motivation-quote-frame-${num}`),
    sku: `FM-FRM-MOT-${num}`,
    desc: `Wall Framed Poster (8x12 inch) featuring Motivational Quote design. Printed on 300 GSM photographic paper with lightweight durable frame.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/motivation-${num}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      packaging_profile: 'Profile A',
      dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
      weight: { value: 0.45, unit: 'kg' },
    }
  });
}

// 4. Porsche frame
products.push({
  name: 'Porsche GT3 RS Wall Frame Set',
  slug: 'porsche-gt3-rs-wall-frame-set',
  sku: 'FM-FRM-POR-GT3',
  desc: 'Set of 3 - Porsche GT3 RS Wall Poster Frame | 8x12 inch (A4 Size). Printed on 300 GSM photographic paper.',
  base_price: 249,
  cats: ['frames', 'wall-art'],
  images: ['/catalog/frames/porsche-gt3-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'CONFIRMED_SOURCE',
    provisional_price: false,
    packaging_profile: 'Profile A',
    dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
    weight: { value: 0.25, unit: 'kg' },
  }
});

// 5. Anime (4)
const animePacks = [10, 12, 20, 24];
animePacks.forEach(pack => {
  products.push({
    name: `Anime Mix Poster Pack (Set of ${pack})`,
    slug: slugify(`anime-mix-poster-pack-${pack}`),
    sku: `FM-PST-ANI-${pack}`,
    desc: `Anime Universe: Anime poster Set of ${pack} Mix Anime Wall Posters for room decor. Printed on 300 GSM photographic paper, unframed.`,
    base_price: pack === 10 ? 199 : pack === 12 ? 249 : pack === 20 ? 299 : 349,
    cats: ['posters'],
    images: [`/catalog/posters/anime-pack${pack}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      packaging_profile: 'Profile C',
      dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
      weight: { value: 0.30, unit: 'kg' },
    }
  });
});

// 6. Car split (7)
const carSplits = ['Alfa Romeo', 'Orange Lambo', 'cyan porche', 'green lambo BAKC', 'green lambo FRONT', 'grey BMW', 'pink lambo'];
carSplits.forEach(car => {
  products.push({
    name: `${car} Split Poster Set`,
    slug: slugify(`${car}-split-poster-set`),
    sku: `FM-PST-SPL-CAR-${slugify(car).toUpperCase()}`,
    desc: `Pack of 3 - ${car} Super Car Split Poster Set (12x18 inch each, 36x18 inch display). Printed on 170 GSM photographic paper, unframed.`,
    base_price: 299,
    cats: ['posters'],
    images: [`/catalog/posters/carsplit-${slugify(car)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      packaging_profile: 'Profile B',
      dimensions: { length: 48, width: 10, height: 10, unit: 'cm' },
      weight: { value: 0.25, unit: 'kg' },
    }
  });
});

// 7. Ronaldo Split (6)
const ronaldoClubs = ['Al Nassr', 'Juventus', 'Manchester Utd', 'Portugal', 'Real Madrid', 'Sporting Lisbon'];
ronaldoClubs.forEach(club => {
  products.push({
    name: `Cristiano Ronaldo ${club} Split Poster`,
    slug: slugify(`ronaldo-${club}-split-poster`),
    sku: `FM-PST-SPL-RONALDO-${slugify(club).toUpperCase()}`,
    desc: `Set of 3 - Cristiano Ronaldo Split Design Posters | Full Size 36x18 inch (12x18 inch per panel). Printed on 170 GSM fine art paper, unframed.`,
    base_price: 299,
    cats: ['posters', 'wall-art'],
    images: [`/catalog/posters/ronaldo-split-${slugify(club)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      packaging_profile: 'Profile B',
      dimensions: { length: 48, width: 10, height: 10, unit: 'cm' },
      weight: { value: 0.25, unit: 'kg' },
    }
  });
});

// 8. Split Anime (7)
const splitAnimes = ['Eren', 'Levi', 'Light', 'ichigo', 'itachi', 'monkey', 'sasuke'];
splitAnimes.forEach(anime => {
  products.push({
    name: `Split ${anime} Anime Poster Set`,
    slug: slugify(`split-${anime}-anime-poster-set`),
    sku: `FM-PST-SPL-ANI-${anime.toUpperCase()}`,
    desc: `Set of 3 - Anime character split design poster set. Printed on 170 GSM photographic paper, unframed.`,
    base_price: 299,
    cats: ['posters'],
    images: [`/catalog/posters/split-anime-${slugify(anime)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      packaging_profile: 'Profile B',
      dimensions: { length: 48, width: 10, height: 10, unit: 'cm' },
      weight: { value: 0.30, unit: 'kg' },
    }
  });
});

// 9. Bookmarks (6) - BM-1, BM-3, BM-4, BM Animal 1, BM Animal 2, BM Animal 3
const bookmarks = ['BM-1', 'BM-3', 'BM-4', 'BM Animal 1', 'BM Animal 2', 'BM Animal 3'];
bookmarks.forEach(bm => {
  products.push({
    name: `${bm} Theme Bookmarks Set`,
    slug: slugify(`${bm}-theme-bookmarks-set`),
    sku: `FM-BKM-${slugify(bm).toUpperCase()}`,
    desc: `${bm} Theme Bookmarks (Set Of 10 Pcs, 21x6 cm). Vibrant double-sided prints on durable 300 GSM coated cardstock.`,
    base_price: 149,
    cats: ['bookmarks'],
    images: [`/catalog/bookmarks/${slugify(bm)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      packaging_profile: 'Profile D',
      dimensions: { length: 23, width: 8, height: 2, unit: 'cm' },
      weight: { value: 0.12, unit: 'kg' },
    }
  });
});

// 10. Car 8
products.push({
  name: 'Car Posters Set of 8',
  slug: 'car-posters-set-of-8',
  sku: 'FM-PST-CAR-8',
  desc: 'Car Posters Set of 8 A4 Size - Car posters for wall. Printed on 300 GSM photographic paper.',
  base_price: 249,
  cats: ['posters'],
  images: ['/catalog/posters/car8-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'PROVISIONAL_ESTIMATE',
    provisional_price: true,
    packaging_profile: 'Profile C',
    dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
    weight: { value: 0.20, unit: 'kg' },
  }
});

// 11. Football 10
products.push({
  name: 'Football Wall Posters (Set of 10)',
  slug: 'football-wall-posters-set-of-10',
  sku: 'FM-PST-FBL-10',
  desc: 'Set of 10 football Wall Posters | A4 size. Printed on 300 GSM photographic paper.',
  base_price: 299,
  cats: ['posters'],
  images: ['/catalog/posters/football10-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'CONFIRMED_SOURCE',
    provisional_price: false,
    packaging_profile: 'Profile C',
    dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
    weight: { value: 0.21, unit: 'kg' },
  }
});

// 12. Wanted 10
products.push({
  name: 'One Piece Wanted Posters (Pack of 10)',
  slug: 'one-piece-wanted-posters-pack-of-10',
  sku: 'FM-PST-OP-WANTED-10',
  desc: 'Pack Of 10 One Piece straw hat pirates wanted poster Luffy Gear 5 Size 8X10 inch.',
  base_price: 249,
  cats: ['posters'],
  images: ['/catalog/posters/wanted10-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'PROVISIONAL_ESTIMATE',
    provisional_price: true,
    packaging_profile: 'Profile C',
    dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
    weight: { value: 0.20, unit: 'kg' },
  }
});

const content = `export const catalogue = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'packages/database/prisma/catalogue/data.ts'), content);
console.log('Generated ' + products.length + ' products');
