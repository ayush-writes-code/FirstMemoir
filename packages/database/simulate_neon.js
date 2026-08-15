import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`TRUNCATE _prisma_migrations`);
  await prisma.$executeRawUnsafe(`
    INSERT INTO _prisma_migrations (id, migration_name, checksum, started_at, finished_at, applied_steps_count, logs) VALUES
    ('2dbdd88d-355e-4087-8271-47002aa2419d', '0_init', 'f2f7a0fb5450f305f9e1e370d0ec11a61889a21e800f22c11e23b378845ef3d7', '2026-08-05T20:34:58.629Z', '2026-08-05T20:35:00.345Z', 1, ''),
    ('a694f588-c280-4bff-b9bf-923d7762cd51', '1_phase_6b_cart_upload_lifecycle', '2d6fed361083e5ad3fd01ffb37097b43990e4faec26afa950aaac8867b1922c0', '2026-08-05T21:07:19.606Z', '2026-08-05T21:07:19.606Z', 1, ''),
    ('87a56dc1-e949-42ed-b5b1-5126719f5fb1', '2_phase_6b_schema_sync', '28aaba077f61d8f507d33fdd6da3f7486890441633bcb3b3013444e5e94d2cf9', '2026-08-08T13:31:23.218Z', '2026-08-08T13:31:23.218Z', 1, ''),
    ('e1176069-ca08-44b0-88a7-b53e63c121f6', '3_phase_6c_orientation', '6db145d886dfa5a35d6f43e94ddf3329ab77587baae820375d8443bb768dee0e', '2026-08-08T15:13:43.541Z', '2026-08-08T15:13:43.541Z', 1, ''),
    ('a1d1f7a5-8e00-4c58-a033-c4e2b37c562b', '20260809235000_4_phase_6d_checkout', '4f2acdd70b5e9e55c0af719f76dd1e993ca8c768aaa587a5599d578692d95305', '2026-08-09T18:22:58.375Z', '2026-08-09T18:23:00.738Z', 1, ''),
    ('66eb0502-111f-4ad0-b98e-84791cfc48cb', '20260811000000_enforce_razorpay_uniqueness', '5f383ef61d4ef6dd18483ebe0a426b29d4f77926f165c8a60e23ee8250d2e465', '2026-08-11T08:03:01.476Z', '2026-08-11T08:03:03.198Z', 1, '')
  `);
}
main().catch(console.error).finally(() => prisma.$disconnect());
