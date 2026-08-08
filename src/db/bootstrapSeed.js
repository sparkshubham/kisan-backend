import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

async function count(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return rows[0].c;
}

/**
 * Idempotent bootstrap data — only fills empty tables.
 * Safe on every deploy / cold start.
 */
export async function bootstrapSeed(client = pool) {
  const summary = [];

  // Settings
  if ((await count(client, 'settings')) === 0) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES
       ('store', $1::jsonb),
       ('payments', $2::jsonb)`,
      [
        JSON.stringify({
          storeName: 'Kisan Mall',
          storeEmail: 'support@kisanmall.com',
          storePhone: '',
          deliveryFee: 30,
          minOrder: 99,
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        }),
        JSON.stringify({ enableCOD: true, enableUPI: true, enableNotifications: true }),
      ]
    );
    summary.push('settings');
  }

  // Serviceable pincodes
  if ((await count(client, 'serviceable_pincodes')) === 0) {
    for (const pin of ['311001', '311002', '311003', '311004', '311005']) {
      await client.query(
        'INSERT INTO serviceable_pincodes (pincode, city) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [pin, 'Bhilwara']
      );
    }
    summary.push('pincodes');
  }

  // Categories
  if ((await count(client, 'categories')) === 0) {
    const categories = [
      ['cat1', 'Grocery', 'grocery', '🌾', 1, 'active', JSON.stringify(['Atta', 'Rice', 'Pulses', 'Oil'])],
      ['cat2', 'Fruits', 'fruits', '🍎', 2, 'active', '[]'],
      ['cat3', 'Vegetables', 'vegetables', '🥦', 3, 'active', '[]'],
      ['cat4', 'Dairy', 'dairy', '🥛', 4, 'active', '[]'],
      ['cat5', 'Beverages', 'beverages', '🥤', 5, 'active', '[]'],
      ['cat6', 'Snacks', 'snacks', '🍪', 6, 'active', '[]'],
      ['cat7', 'Personal Care', 'personal-care', '🧴', 7, 'active', '[]'],
      ['cat8', 'Home Care', 'home-care', '🏠', 8, 'active', '[]'],
    ];
    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (id, name, slug, image, sort_order, status, subcategories)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (id) DO NOTHING`,
        c
      );
    }
    summary.push('categories');
  }

  // Brands
  if ((await count(client, 'brands')) === 0) {
    const brands = [
      ['b1', 'Aashirvaad', '🌾', 'Atta and flour'],
      ['b2', 'Fortune', '🫒', 'Cooking oils'],
      ['b3', 'Amul', '🥛', 'Dairy products'],
      ['b4', 'Daawat', '🍚', 'Basmati rice'],
      ['b5', 'Britannia', '🍞', 'Bakery'],
    ];
    for (const [id, name, logo, desc] of brands) {
      await client.query(
        'INSERT INTO brands (id, name, logo, description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
        [id, name, logo, desc]
      );
    }
    summary.push('brands');
  }

  // Sample products
  if ((await count(client, 'products')) === 0) {
    const products = [
      ['p1', 'Aashirvaad Atta 5 KG', 'ATT001', '8901030865432', 'cat1', 'Atta', 'b1', 320, 285, 35, 5, 'KG', '5 KG', 'Premium whole wheat atta', 50, 20, 'A-12', '03', '02', '🌾', 4.7, true, true],
      ['p2', 'Fortune Oil 1L', 'OIL001', '8901491100123', 'cat1', 'Oil', 'b2', 160, 145, 15, 5, 'L', '1 L', 'Refined sunflower oil', 80, 30, 'B-05', '01', '01', '🫒', 4.5, true, false],
      ['p3', 'Amul Taaza Milk 1L', 'MIL001', '8901262010123', 'cat4', '', 'b3', 60, 56, 4, 0, 'L', '1 L', 'Fresh toned milk', 100, 40, 'C-01', '02', '01', '🥛', 4.8, true, true],
      ['p4', 'Basmati Rice 5 KG', 'RIC001', '8901030865440', 'cat1', 'Rice', 'b4', 450, 399, 51, 5, 'KG', '5 KG', 'Premium basmati rice', 40, 15, 'A-08', '02', '03', '🍚', 4.6, false, true],
      ['p5', 'Britannia Bread', 'BRD001', '8901030865488', 'cat1', 'Atta', 'b5', 45, 40, 5, 0, 'g', '400g', 'Soft milk bread', 60, 10, 'D-02', '01', '01', '🍞', 4.3, true, false],
      ['p6', 'Fresh Tomatoes 500g', 'TOM001', '8901030865464', 'cat3', '', null, 40, 35, 5, 0, 'g', '500g', 'Farm fresh tomatoes', 70, 20, 'E-01', '01', '01', '🍅', 4.4, true, false],
    ];
    for (const p of products) {
      await client.query(
        `INSERT INTO products (
           id,name,sku,barcode,category_id,subcategory,brand_id,mrp,sale_price,discount,tax,unit,weight,description,
           stock,low_stock_limit,rack,shelf,bin,emoji,rating,popular,deal
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (id) DO NOTHING`,
        p
      );
    }
    summary.push('products');
  }

  // Delivery slots
  if ((await count(client, 'delivery_slots')) === 0) {
    const slots = [
      ['s1', '10 AM - 12 PM', '10:00', '12:00', 30, 'active'],
      ['s2', '12 PM - 2 PM', '12:00', '14:00', 30, 'active'],
      ['s3', '2 PM - 4 PM', '14:00', '16:00', 30, 'active'],
      ['s4', '4 PM - 6 PM', '16:00', '18:00', 30, 'active'],
      ['s5', '6 PM - 8 PM', '18:00', '20:00', 30, 'active'],
      ['s6', '8 PM - 10 PM', '20:00', '22:00', 30, 'active'],
    ];
    for (const s of slots) {
      await client.query(
        `INSERT INTO delivery_slots (id, label, start_time, end_time, max_orders, status)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        s
      );
    }
    summary.push('delivery_slots');
  }

  // Coupons
  if ((await count(client, 'coupons')) === 0) {
    const coupons = [
      ['cp1', 'KISAN50', 'Flat ₹50 off', 'flat', 50, 499, 50, '2026-01-01', '2027-12-31', 1000],
      ['cp2', 'SAVE10', '10% off up to ₹100', 'percent', 10, 200, 100, '2026-01-01', '2027-12-31', 500],
      ['cp3', 'FIRST100', '₹100 off first order', 'flat', 100, 599, 100, '2026-01-01', '2027-12-31', 2000],
    ];
    for (const c of coupons) {
      await client.query(
        `INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order, max_discount, start_date, end_date, usage_limit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        c
      );
    }
    summary.push('coupons');
  }

  // Banners
  if ((await count(client, 'banners')) === 0) {
    await client.query(
      `INSERT INTO banners (id, title, description, image, link_type, link_id, start_date, end_date)
       VALUES
       ('bn1', 'FAST DELIVERY', '15-30 min delivery', '🛵', 'category', 'cat1', '2026-01-01', '2027-12-31'),
       ('bn2', 'Fresh Vegetables', 'Farm fresh daily', '🥦', 'category', 'cat3', '2026-01-01', '2027-12-31')
       ON CONFLICT (id) DO NOTHING`
    );
    summary.push('banners');
  }

  // Default admin (env overrides)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kisanmall.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Super Admin';
  const existingAdmin = await client.query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);
  if (existingAdmin.rowCount === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO admin_users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'super_admin') ON CONFLICT (id) DO NOTHING`,
      ['admin1', adminName, adminEmail, hash]
    );
    summary.push(`admin:${adminEmail}`);
  }

  // Default staff (packer + delivery)
  if ((await count(client, 'staff_users')) === 0) {
    const pinHash = await bcrypt.hash(process.env.STAFF_PIN || '1234', 10);
    await client.query(
      `INSERT INTO staff_users (id, name, mobile, pin_hash, role) VALUES
       ('staff1', 'Rajesh Kumar', '9999900001', $1, 'packer'),
       ('staff2', 'Mukesh', '9999900002', $1, 'delivery_boy')
       ON CONFLICT (id) DO NOTHING`,
      [pinHash]
    );
    summary.push('staff');
  }

  if (summary.length) {
    console.log('[seed] Bootstrap inserted:', summary.join(', '));
  } else {
    console.log('[seed] Bootstrap skipped (data already present)');
  }

  return summary;
}
