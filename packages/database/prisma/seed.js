"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var categoryData, categories, _i, categoryData_1, cat, created, subCategories, _a, subCategories_1, cat, created, frameMaterialsData, _b, frameMaterialsData_1, fm, existing, photos, productsData, _c, productsData_1, prod, existing, mainImg, secondImg, product, _d, _e, catSlug;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('Starting seed...');
                    // 0. Seed Admin User
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { phone_number: '9999999999' },
                            update: { role: 'ADMIN', first_name: 'Super', last_name: 'Admin' },
                            create: { phone_number: '9999999999', role: 'ADMIN', first_name: 'Super', last_name: 'Admin' }
                        })];
                case 1:
                    // 0. Seed Admin User
                    _f.sent();
                    console.log('Upserted Admin user (9999999999)');
                    categoryData = [
                        { name: 'Framed Prints', slug: 'framed-prints', sort_order: 1 },
                        { name: 'Canvas Prints', slug: 'canvas-prints', sort_order: 2 },
                        { name: 'Posters', slug: 'posters', sort_order: 3 },
                        { name: 'Photo Books', slug: 'photo-books', sort_order: 4 },
                        { name: 'Wall Art', slug: 'wall-art', sort_order: 5 },
                        { name: 'Personalised Gifts', slug: 'personalised-gifts', sort_order: 6 }
                    ];
                    categories = {};
                    _i = 0, categoryData_1 = categoryData;
                    _f.label = 2;
                case 2:
                    if (!(_i < categoryData_1.length)) return [3 /*break*/, 5];
                    cat = categoryData_1[_i];
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { slug: cat.slug },
                            update: cat,
                            create: cat,
                        })];
                case 3:
                    created = _f.sent();
                    categories[cat.slug] = created.id;
                    console.log("Upserted category: ".concat(cat.name));
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    subCategories = [
                        { name: 'Black & White', slug: 'black-and-white', sort_order: 7, parent_id: categories['framed-prints'] },
                        { name: 'Portrait Frames', slug: 'portrait-frames', sort_order: 8, parent_id: categories['framed-prints'] }
                    ];
                    _a = 0, subCategories_1 = subCategories;
                    _f.label = 6;
                case 6:
                    if (!(_a < subCategories_1.length)) return [3 /*break*/, 9];
                    cat = subCategories_1[_a];
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { slug: cat.slug },
                            update: cat,
                            create: cat,
                        })];
                case 7:
                    created = _f.sent();
                    categories[cat.slug] = created.id;
                    console.log("Upserted category: ".concat(cat.name));
                    _f.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    frameMaterialsData = [
                        { name: 'Natural Oak Frame', type: 'FRAME', price_modifier: 499 },
                        { name: 'Matte Black Frame', type: 'FRAME', price_modifier: 449 },
                        { name: 'Rustic Walnut Frame', type: 'FRAME', price_modifier: 599 },
                        { name: 'White Frame', type: 'FRAME', price_modifier: 349 },
                        { name: 'Standard Glass', type: 'GLASS', price_modifier: 199 },
                        { name: 'Anti-Glare Glass', type: 'GLASS', price_modifier: 349 }
                    ];
                    _b = 0, frameMaterialsData_1 = frameMaterialsData;
                    _f.label = 10;
                case 10:
                    if (!(_b < frameMaterialsData_1.length)) return [3 /*break*/, 16];
                    fm = frameMaterialsData_1[_b];
                    return [4 /*yield*/, prisma.frameMaterial.findFirst({
                            where: { name: fm.name, type: fm.type }
                        })];
                case 11:
                    existing = _f.sent();
                    if (!existing) return [3 /*break*/, 13];
                    return [4 /*yield*/, prisma.frameMaterial.update({
                            where: { id: existing.id },
                            data: { price_modifier: new client_1.Prisma.Decimal(fm.price_modifier) }
                        })];
                case 12:
                    _f.sent();
                    console.log("Updated frame material: ".concat(fm.name));
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, prisma.frameMaterial.create({
                        data: {
                            name: fm.name,
                            type: fm.type,
                            price_modifier: new client_1.Prisma.Decimal(fm.price_modifier)
                        }
                    })];
                case 14:
                    _f.sent();
                    console.log("Created frame material: ".concat(fm.name));
                    _f.label = 15;
                case 15:
                    _b++;
                    return [3 /*break*/, 10];
                case 16:
                    photos = [
                        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800',
                        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
                        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
                        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
                        'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
                        'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800',
                        'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
                        'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=800'
                    ];
                    productsData = [
                        { name: 'Mountain Serenity Print', slug: 'mountain-serenity-print', base_price: 1299, cats: ['framed-prints', 'wall-art'], imgIdx: 0 },
                        { name: 'Ocean Horizon Canvas', slug: 'ocean-horizon-canvas', base_price: 1599, cats: ['canvas-prints'], imgIdx: 1 },
                        { name: 'Urban Architecture Poster', slug: 'urban-architecture-poster', base_price: 799, cats: ['posters'], imgIdx: 2 },
                        { name: 'Golden Hour Portrait Frame', slug: 'golden-hour-portrait-frame', base_price: 1899, cats: ['framed-prints', 'portrait-frames'], imgIdx: 3 },
                        { name: 'Forest Walk Canvas', slug: 'forest-walk-canvas', base_price: 1399, cats: ['canvas-prints', 'wall-art'], imgIdx: 4 },
                        { name: 'City Lights Black & White', slug: 'city-lights-black-white', base_price: 1099, cats: ['black-and-white', 'posters'], imgIdx: 5 },
                        { name: 'Coastal Sunrise Print', slug: 'coastal-sunrise-print', base_price: 1199, cats: ['framed-prints'], imgIdx: 6 },
                        { name: 'Abstract Geometry Poster', slug: 'abstract-geometry-poster', base_price: 899, cats: ['posters', 'wall-art'], imgIdx: 7 }
                    ];
                    _c = 0, productsData_1 = productsData;
                    _f.label = 17;
                case 17:
                    if (!(_c < productsData_1.length)) return [3 /*break*/, 28];
                    prod = productsData_1[_c];
                    return [4 /*yield*/, prisma.product.findUnique({
                            where: { slug: prod.slug }
                        })];
                case 18:
                    existing = _f.sent();
                    mainImg = photos[prod.imgIdx];
                    secondImg = photos[(prod.imgIdx + 1) % photos.length];
                    if (!existing) return [3 /*break*/, 20];
                    // Just update basic fields
                    return [4 /*yield*/, prisma.product.update({
                            where: { id: existing.id },
                            data: {
                                name: prod.name,
                                base_price: new client_1.Prisma.Decimal(prod.base_price)
                            }
                        })];
                case 19:
                    // Just update basic fields
                    _f.sent();
                    console.log("Updated product: ".concat(prod.name));
                    return [3 /*break*/, 27];
                case 20: return [4 /*yield*/, prisma.product.create({
                        data: {
                            name: prod.name,
                            slug: prod.slug,
                            base_price: new client_1.Prisma.Decimal(prod.base_price)
                        }
                    })];
                case 21:
                    product = _f.sent();
                    _d = 0, _e = prod.cats;
                    _f.label = 22;
                case 22:
                    if (!(_d < _e.length)) return [3 /*break*/, 25];
                    catSlug = _e[_d];
                    if (!categories[catSlug]) return [3 /*break*/, 24];
                    return [4 /*yield*/, prisma.productCategory.create({
                            data: {
                                product_id: product.id,
                                category_id: categories[catSlug]
                            }
                        })];
                case 23:
                    _f.sent();
                    _f.label = 24;
                case 24:
                    _d++;
                    return [3 /*break*/, 22];
                case 25: 
                // Images
                return [4 /*yield*/, prisma.productImage.createMany({
                        data: [
                            { product_id: product.id, url: mainImg, sort_order: 0 },
                            { product_id: product.id, url: secondImg, sort_order: 1 }
                        ]
                    })];
                case 26:
                    // Images
                    _f.sent();
                    console.log("Created product: ".concat(prod.name));
                    _f.label = 27;
                case 27:
                    _c++;
                    return [3 /*break*/, 17];
                case 28:
                    console.log('Seed completed successfully.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
