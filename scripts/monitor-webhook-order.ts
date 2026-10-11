import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env credentials from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

async function main() {
  const { prisma } = await import('@repo/database');

  console.log('=== Checking Staging Neon DB for Latest Orders & Payments ===');
  
  const latestOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      items: {
        include: {
          product: { select: { name: true, sku: true } },
          upload: { select: { id: true, retention_status: true } }
        }
      },
      payments: true,
      status_history: true
    }
  });

  console.log(`Found ${latestOrders.length} recent order(s):\n`);

  for (const order of latestOrders) {
    console.log(`---------------------------------------------------------------`);
    console.log(`Order ID:          ${order.id}`);
    console.log(`Status:            ${order.status}`);
    console.log(`Amount:            ₹${order.total_amount}`);
    console.log(`Razorpay Order ID: ${order.razorpay_order_id}`);
    console.log(`Created At:        ${order.created_at.toISOString()}`);
    console.log(`Customer:          ${order.customer_email || 'N/A'} / ${order.customer_phone || 'N/A'}`);
    
    console.log(`Payments (${order.payments.length}):`);
    for (const p of order.payments) {
      console.log(`  - Payment ID: ${p.razorpay_payment_id} | Status: ${p.status} | Amount: ₹${p.amount} | Method: ${p.method}`);
    }

    console.log(`Status History (${order.status_history.length}):`);
    for (const h of order.status_history) {
      console.log(`  - ${h.previous_status || 'NONE'} -> ${h.new_status} (${h.description || ''}) at ${h.created_at.toISOString()}`);
    }

    console.log(`Items (${order.items.length}):`);
    for (const it of order.items) {
      console.log(`  - Product: ${it.product.name} (${it.product.sku}) x${it.quantity}`);
      if (it.upload) {
        console.log(`    Upload ID: ${it.upload.id} | Retention Status: ${it.upload.retention_status}`);
      }
    }
  }

  const latestWebhooks = await prisma.webhookEvent.findMany({
    take: 5,
    orderBy: { received_at: 'desc' }
  });

  console.log(`\n===============================================================`);
  console.log(`Recent Webhook Events in Database (${latestWebhooks.length}):`);
  for (const w of latestWebhooks) {
    console.log(`  - Event ID: ${w.event_id} | Type: ${w.event_type} | Status: ${w.processing_status} | Received: ${w.received_at.toISOString()}`);
  }
  console.log(`===============================================================`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
