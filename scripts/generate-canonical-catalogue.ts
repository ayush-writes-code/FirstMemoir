import * as fs from 'fs';
import * as path from 'path';

function slugify(text: string): string {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

interface ProductEntry {
  name: string;
  slug: string;
  sku: string;
  desc: string;
  base_price: number;
  cats: string[];
  images: string[];
  manufacturing_metadata: {
    pricing_status: 'CONFIRMED_SOURCE' | 'PROVISIONAL_ESTIMATE';
    provisional_price: boolean;
    source_mapping: {
      source_folder: string;
      has_source_info: boolean;
      source_sku: string | null;
    };
    product_specs: {
      paper: { value: string | null; status: 'SOURCE_CONFIRMED' | 'UNKNOWN' };
      dimensions: { value: string | null; status: 'SOURCE_CONFIRMED' | 'PROVISIONAL' | 'UNKNOWN' };
      raw_weight: { value: string | null; status: 'SOURCE_CONFIRMED' | 'UNKNOWN' };
    };
    provisional_packaging: {
      profile: 'Profile A' | 'Profile B' | 'Profile C' | 'Profile D';
      status: 'PROVISIONAL_ESTIMATE';
      dimensions: { length: number; width: number; height: number; unit: string };
      weight: { value: number; unit: string };
    };
  };
}

const products: ProductEntry[] = [];

// ============================================================================
// 1. Frames 8x12: Fast & Furious Cars (8 listings)
// ============================================================================
const ffCars = ['Camaro', 'Eclipse', 'Lancer', 'Mazda', 'S2000', 'Silvia', 'Skyline', 'Supra'];
ffCars.forEach(car => {
  products.push({
    name: `Fast & Furious ${car} Frame`,
    slug: slugify(`ff-${car}-frame`),
    sku: `FM-FRM-FFC-${car.toUpperCase()}`,
    desc: `Fast & Furious ${car} framed wall art (8x12 inch). Specifications provisional pending client confirmation.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/ffc-${slugify(car)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      source_mapping: {
        source_folder: `Frames 8x12/F&F cars (8 variations)/${car}`,
        has_source_info: false,
        source_sku: null
      },
      product_specs: {
        paper: { value: null, status: 'UNKNOWN' },
        dimensions: { value: '8x12 inch', status: 'PROVISIONAL' },
        raw_weight: { value: null, status: 'UNKNOWN' }
      },
      provisional_packaging: {
        profile: 'Profile A',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
        weight: { value: 0.45, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 2. Frames 8x12: Football Jerseys (10 listings)
// ============================================================================
const fbPlayers = [
  { folder: 'Ronaldo', name: 'Cristiano Ronaldo', skuCode: 'RONALDO' },
  { folder: 'beckham', name: 'David Beckham', skuCode: 'BECKHAM' },
  { folder: 'ibrahimovic', name: 'Zlatan Ibrahimović', skuCode: 'IBRAHIMOVIC' },
  { folder: 'mbappe', name: 'Kylian Mbappé', skuCode: 'MBAPPE' },
  { folder: 'neymar', name: 'Neymar Jr.', skuCode: 'NEYMAR' },
  { folder: 'pessi', name: 'Lionel Messi', skuCode: 'MESSI' },
  { folder: 'ramos', name: 'Sergio Ramos', skuCode: 'RAMOS' },
  { folder: 'ronaldinho', name: 'Ronaldinho Gaúcho', skuCode: 'RONALDINHO' },
  { folder: 'van dijk', name: 'Virgil van Dijk', skuCode: 'VANDIJK' },
  { folder: 'zidane', name: 'Zinedine Zidane', skuCode: 'ZIDANE' }
];

fbPlayers.forEach(p => {
  products.push({
    name: `${p.name} Jersey Frame`,
    slug: slugify(`${p.name}-jersey-frame`),
    sku: `FM-FRM-FBL-${p.skuCode}`,
    desc: `Wall Poster Frame (8x12 inch) featuring ${p.name} World Cup special jersey artwork. Printed on 300 GSM photographic paper.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/football-${slugify(p.folder)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      source_mapping: {
        source_folder: `Frames 8x12/Football jerseys (10 variations)/${p.folder}`,
        has_source_info: true,
        source_sku: null
      },
      product_specs: {
        paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: '8x12 inch', status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: '300g total', status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile A',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
        weight: { value: 0.45, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 3. Frames 8x12: Motivations Quotes (30 listings)
// ============================================================================
for (let i = 1; i <= 30; i++) {
  const num = i.toString().padStart(2, '0');
  products.push({
    name: `Motivation Quote Frame ${num}`,
    slug: slugify(`motivation-quote-frame-${num}`),
    sku: `FM-FRM-MOT-${num}`,
    desc: `Wall Framed Poster (8x12 inch) featuring Motivational Quote design. Printed on 300 GSM photographic paper.`,
    base_price: 299,
    cats: ['frames', 'wall-art'],
    images: [`/catalog/frames/motivation-${num}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      source_mapping: {
        source_folder: `Frames 8x12/Motivations Quotes (30 variations)/Motivation quits (${i})`,
        has_source_info: true,
        source_sku: `Motivation_frame_${num}`
      },
      product_specs: {
        paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: '8x12 inch', status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: '290g total', status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile A',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
        weight: { value: 0.45, unit: 'kg' }
      }
    }
  });
}

// ============================================================================
// 4. Frames 8x12: Porsche GT3 RS (1 listing)
// ============================================================================
products.push({
  name: 'Porsche GT3 RS Wall Frame Set',
  slug: 'porsche-gt3-rs-wall-frame-set',
  sku: 'FM-FRM-POR-GT3',
  desc: 'Set of 3 - Porsche GT3 RS Wall Poster Frame (8x12 inch). Printed on 300 GSM photographic paper.',
  base_price: 249,
  cats: ['frames', 'wall-art'],
  images: ['/catalog/frames/porsche-gt3-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'CONFIRMED_SOURCE',
    provisional_price: false,
    source_mapping: {
      source_folder: 'Frames 8x12/Porsche frame listing pics',
      has_source_info: true,
      source_sku: null
    },
    product_specs: {
      paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
      dimensions: { value: '8x12 inch', status: 'SOURCE_CONFIRMED' },
      raw_weight: { value: '250g total', status: 'SOURCE_CONFIRMED' }
    },
    provisional_packaging: {
      profile: 'Profile A',
      status: 'PROVISIONAL_ESTIMATE',
      dimensions: { length: 35, width: 25, height: 4, unit: 'cm' },
      weight: { value: 0.45, unit: 'kg' }
    }
  }
});

// ============================================================================
// 5. Posters: Anime Mix (4 listings)
// ============================================================================
const animePacks = [
  { folder: 'Anime 10', pack: 10, price: 199, dims: 'A4 (12x9 inch)', weight: '200g total' },
  { folder: 'Anime 12', pack: 12, price: 249, dims: '12x4.5 inch', weight: '150g total' },
  { folder: 'anime 20', pack: 20, price: 299, dims: 'A4 (8.3x11.9 inch)', weight: '250g total' },
  { folder: 'Anime 24', pack: 24, price: 349, dims: '9x6 inch', weight: '200g total' }
];

animePacks.forEach(p => {
  products.push({
    name: `Anime Mix Poster Pack (Set of ${p.pack})`,
    slug: slugify(`anime-mix-poster-pack-${p.pack}`),
    sku: `FM-PST-ANI-${p.pack}`,
    desc: `Anime poster set of ${p.pack} mix anime wall posters for room decor (${p.dims}). Printed on 300 GSM photographic paper, unframed.`,
    base_price: p.price,
    cats: ['posters'],
    images: [`/catalog/posters/anime-pack${p.pack}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      source_mapping: {
        source_folder: `Posters/Anime (4 variations)/${p.folder}`,
        has_source_info: true,
        source_sku: null
      },
      product_specs: {
        paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: p.dims, status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: p.weight, status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile C',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
        weight: { value: 0.30, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 6. Posters: Car Split Posters (7 listings)
// ============================================================================
const carSplits = [
  { folder: 'Alfa Romeo', name: 'Alfa Romeo', sku: 'AlfaRomeo_car', skuSuffix: 'ALFA-ROMEO' },
  { folder: 'Orange Lambo', name: 'Orange Lamborghini', sku: 'Orange lambo_car', skuSuffix: 'ORANGE-LAMBO' },
  { folder: 'cyan porche', name: 'Cyan Porsche', sku: 'Cyan Porsche_car', skuSuffix: 'CYAN-PORCHE' },
  { folder: 'green lambo BAKC', name: 'Green Lamborghini Back', sku: 'Green lambo_car_back', skuSuffix: 'GREEN-LAMBO-BACK' },
  { folder: 'green lambo FRONT', name: 'Green Lamborghini Front', sku: 'Green lambo_car_front', skuSuffix: 'GREEN-LAMBO-FRONT' },
  { folder: 'grey BMW', name: 'Grey BMW M4', sku: 'Grey BMW_car', skuSuffix: 'GREY-BMW' },
  { folder: 'pink lambo', name: 'Pink Lamborghini', sku: 'Pink lambo_car', skuSuffix: 'PINK-LAMBO' }
];

carSplits.forEach(c => {
  products.push({
    name: `${c.name} Split Poster Set`,
    slug: slugify(`${c.name}-split-poster-set`),
    sku: `FM-PST-SPL-CAR-${c.skuSuffix}`,
    desc: `Pack of 3 - ${c.name} Super Car Split Poster Set (12x18 inch each panel, 36x18 inch display). Printed on 170 GSM photographic paper, rolled packed, unframed.`,
    base_price: 299,
    cats: ['posters'],
    images: [`/catalog/posters/carsplit-${slugify(c.folder)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      source_mapping: {
        source_folder: `Posters/Car split (7 variations)/${c.folder}`,
        has_source_info: true,
        source_sku: c.sku
      },
      product_specs: {
        paper: { value: '170 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: '12x18 inch (each panel)', status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: '150g total', status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile B',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 48, width: 10, height: 10, unit: 'cm' },
        weight: { value: 0.25, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 7. Posters: Ronaldo Split (6 listings)
// ============================================================================
const ronaldoClubs = [
  { folder: 'Al Nassr', name: 'Al Nassr Club', skuSuffix: 'AL-NASSR' },
  { folder: 'Juventus', name: 'Juventus Club', skuSuffix: 'JUVENTUS' },
  { folder: 'Manchester Utd', name: 'Manchester United', skuSuffix: 'MANCHESTER-UTD' },
  { folder: 'Portugal', name: 'Portugal National Team', skuSuffix: 'PORTUGAL' },
  { folder: 'Real Madrid', name: 'Real Madrid Club', skuSuffix: 'REAL-MADRID' },
  { folder: 'Sporting Lisbon', name: 'Sporting Lisbon Club', skuSuffix: 'SPORTING-LISBON' }
];

ronaldoClubs.forEach(r => {
  products.push({
    name: `Cristiano Ronaldo ${r.name} Split Poster`,
    slug: slugify(`ronaldo-${r.name}-split-poster`),
    sku: `FM-PST-SPL-RONALDO-${r.skuSuffix}`,
    desc: `Set of 3 - Cristiano Ronaldo Split Design Posters (36x18 inch total, 12x18 inch per panel). Printed on 170 GSM photographic paper, roll package, unframed.`,
    base_price: 299,
    cats: ['posters', 'wall-art'],
    images: [`/catalog/posters/ronaldo-split-${slugify(r.folder)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'CONFIRMED_SOURCE',
      provisional_price: false,
      source_mapping: {
        source_folder: `Posters/Ronaldo Split (6 variations)/${r.folder}`,
        has_source_info: true,
        source_sku: null
      },
      product_specs: {
        paper: { value: '170 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: '12x18 inch (each panel)', status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: '150g total', status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile B',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 48, width: 10, height: 10, unit: 'cm' },
        weight: { value: 0.25, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 8. Posters: Split Anime (7 listings)
// ============================================================================
const splitAnimes = [
  { folder: 'split Eren', character: 'Eren', skuSuffix: 'EREN', hasInfo: false },
  { folder: 'split Levi', character: 'Levi', skuSuffix: 'LEVI', hasInfo: false },
  { folder: 'split Light', character: 'Light', skuSuffix: 'LIGHT', hasInfo: false },
  { folder: 'split ichigo', character: 'Ichigo', skuSuffix: 'ICHIGO', hasInfo: false },
  { folder: 'split itachi', character: 'Itachi', skuSuffix: 'ITACHI', hasInfo: false },
  { folder: 'split monkey', character: 'Luffy Gear 5', skuSuffix: 'MONKEY', hasInfo: true },
  { folder: 'split sasuke', character: 'Sasuke', skuSuffix: 'SASUKE', hasInfo: false }
];

splitAnimes.forEach(a => {
  products.push({
    name: `Split ${a.character} Anime Poster Set`,
    slug: slugify(`split-${a.character}-anime-poster-set`),
    sku: `FM-PST-SPL-ANI-${a.skuSuffix}`,
    desc: a.hasInfo
      ? `Set of 20 manga wall collage kit of One Piece Luffy Gear 5 (8.3x11.8 inch). Printed on 300 GSM photographic paper, unframed.`
      : `Anime character ${a.character} split design poster set. Unframed poster set, specifications provisional pending client confirmation.`,
    base_price: 299,
    cats: ['posters'],
    images: [`/catalog/posters/split-anime-${slugify(a.character)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      source_mapping: {
        source_folder: `Posters/Split Anime (7 variations)/${a.folder}`,
        has_source_info: a.hasInfo,
        source_sku: null
      },
      product_specs: {
        paper: {
          value: a.hasInfo ? '300 GSM photographic paper' : null,
          status: a.hasInfo ? 'SOURCE_CONFIRMED' : 'UNKNOWN'
        },
        dimensions: {
          value: a.hasInfo ? '8.3x11.8 inch' : null,
          status: a.hasInfo ? 'SOURCE_CONFIRMED' : 'UNKNOWN'
        },
        raw_weight: {
          value: a.hasInfo ? '300g total' : null,
          status: a.hasInfo ? 'SOURCE_CONFIRMED' : 'UNKNOWN'
        }
      },
      provisional_packaging: {
        profile: 'Profile C',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
        weight: { value: 0.30, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 9. Posters: Bookmarks (6 listings)
// ============================================================================
const bookmarks = [
  { folder: 'BM Animal 1', name: 'Animal Theme Bookmarks (Set 1)', skuCode: 'ANIMAL-1', sourceSku: 'AnimalBM1', count: 10, dims: '21cm x 6cm' },
  { folder: 'BM Animal 2', name: 'Animal Theme Bookmarks (Set 2)', skuCode: 'ANIMAL-2', sourceSku: 'AnimalBM2', count: 10, dims: '21cm x 6cm' },
  { folder: 'BM Animal 3', name: 'Animal Theme Bookmarks (Set 3)', skuCode: 'ANIMAL-3', sourceSku: 'AnimalBM3', count: 10, dims: '21cm x 6cm' },
  { folder: 'BM-1', name: 'Quotes Theme Bookmarks (Set of 10)', skuCode: 'QUOTES-BM1', sourceSku: null, count: 10, dims: '21cm x 6cm' },
  { folder: 'BM-3', name: 'Panda Quotes Theme Bookmarks (Set of 15)', skuCode: 'PANDA-BM3', sourceSku: null, count: 15, dims: '21cm x 6cm' },
  { folder: 'BM-4', name: 'Anime Theme Bookmarks (Set of 12)', skuCode: 'ANIME-BM4', sourceSku: null, count: 12, dims: '15cm x 5cm' }
];

bookmarks.forEach(b => {
  products.push({
    name: b.name,
    slug: slugify(b.name),
    sku: `FM-BKM-${b.skuCode}`,
    desc: `${b.name} (${b.dims}). Printed on 300 GSM photographic paper.`,
    base_price: 149,
    cats: ['bookmarks'],
    images: [`/catalog/bookmarks/${slugify(b.folder)}-1.jpg`],
    manufacturing_metadata: {
      pricing_status: 'PROVISIONAL_ESTIMATE',
      provisional_price: true,
      source_mapping: {
        source_folder: `Posters/bookmarks (3, 3 variations)/${b.folder}`,
        has_source_info: true,
        source_sku: b.sourceSku
      },
      product_specs: {
        paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
        dimensions: { value: b.dims, status: 'SOURCE_CONFIRMED' },
        raw_weight: { value: '100g total', status: 'SOURCE_CONFIRMED' }
      },
      provisional_packaging: {
        profile: 'Profile D',
        status: 'PROVISIONAL_ESTIMATE',
        dimensions: { length: 23, width: 8, height: 2, unit: 'cm' },
        weight: { value: 0.12, unit: 'kg' }
      }
    }
  });
});

// ============================================================================
// 10. Posters: Standalone Listings in "No category" (3 listings)
// ============================================================================
products.push({
  name: 'Car Posters Set of 8',
  slug: 'car-posters-set-of-8',
  sku: 'FM-PST-CAR-8',
  desc: 'Car Posters Set of 8 (A4 Size) super car wall posters. Printed on 300 GSM photographic paper.',
  base_price: 249,
  cats: ['posters'],
  images: ['/catalog/posters/car8-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'PROVISIONAL_ESTIMATE',
    provisional_price: true,
    source_mapping: {
      source_folder: 'Posters/No category/Car 8',
      has_source_info: true,
      source_sku: null
    },
    product_specs: {
      paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
      dimensions: { value: 'A4', status: 'SOURCE_CONFIRMED' },
      raw_weight: { value: '200g total', status: 'SOURCE_CONFIRMED' }
    },
    provisional_packaging: {
      profile: 'Profile C',
      status: 'PROVISIONAL_ESTIMATE',
      dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
      weight: { value: 0.20, unit: 'kg' }
    }
  }
});

products.push({
  name: 'Football Wall Posters (Set of 10)',
  slug: 'football-wall-posters-set-of-10',
  sku: 'FM-PST-FBL-10',
  desc: 'Set of 10 Football Wall Posters (A4 size). Printed on 300 GSM photographic paper.',
  base_price: 299,
  cats: ['posters'],
  images: ['/catalog/posters/football10-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'CONFIRMED_SOURCE',
    provisional_price: false,
    source_mapping: {
      source_folder: 'Posters/No category/Football 10 listings pics',
      has_source_info: true,
      source_sku: 'Football_10'
    },
    product_specs: {
      paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
      dimensions: { value: 'A4', status: 'SOURCE_CONFIRMED' },
      raw_weight: { value: '210g total', status: 'SOURCE_CONFIRMED' }
    },
    provisional_packaging: {
      profile: 'Profile C',
      status: 'PROVISIONAL_ESTIMATE',
      dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
      weight: { value: 0.21, unit: 'kg' }
    }
  }
});

products.push({
  name: 'One Piece Wanted Posters (Pack of 10)',
  slug: 'one-piece-wanted-posters-pack-of-10',
  sku: 'FM-PST-OP-WANTED-10',
  desc: 'Pack Of 10 One Piece straw hat pirates wanted posters (8x10 inch). Printed on 300 GSM photographic paper.',
  base_price: 249,
  cats: ['posters'],
  images: ['/catalog/posters/wanted10-1.jpg'],
  manufacturing_metadata: {
    pricing_status: 'PROVISIONAL_ESTIMATE',
    provisional_price: true,
    source_mapping: {
      source_folder: 'Posters/No category/Wanted',
      has_source_info: true,
      source_sku: null
    },
    product_specs: {
      paper: { value: '300 GSM photographic paper', status: 'SOURCE_CONFIRMED' },
      dimensions: { value: '8x10 inch', status: 'SOURCE_CONFIRMED' },
      raw_weight: { value: '200g total', status: 'SOURCE_CONFIRMED' }
    },
    provisional_packaging: {
      profile: 'Profile C',
      status: 'PROVISIONAL_ESTIMATE',
      dimensions: { length: 32, width: 24, height: 2.5, unit: 'cm' },
      weight: { value: 0.20, unit: 'kg' }
    }
  }
});

const content = `export const catalogue = ${JSON.stringify(products, null, 2)};
`;

const outputPath = path.join(process.cwd(), 'packages/database/prisma/catalogue/data.ts');
fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Successfully generated canonical catalogue with ${products.length} products.`);
