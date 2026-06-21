const bcrypt = require('bcryptjs');
const path   = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5434,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Admin',
  database: process.env.DB_NAME     || 'sundery_sales',
});

const DEFAULT_USERS = [
  {
    email: 'admin@sundery.com',   password: 'Admin1234',   full_name: 'System Admin', role: 'Admin',
  },
  {
    email: 'viewer@sundery.com',  password: 'Viewer1234',  full_name: 'Viewer User',  role: 'Viewer',
  },
  {
    email: 'cashier@sundery.com', password: 'Cashier1234', full_name: 'Cashier One',  role: 'Cashier',
    locationQuery: `SELECT l.id FROM locations l ORDER BY l.id ASC  LIMIT 1`,
  },
  {
    email: 'cashier2@sundery.com', password: 'Cashier1234', full_name: 'Cashier Two', role: 'Cashier',
    locationQuery: `SELECT l.id FROM locations l ORDER BY l.id ASC  LIMIT 1 OFFSET 1`,
  },
];

async function seedAuth() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const u of DEFAULT_USERS) {
      const { rows: [exists] } = await client.query(
        'SELECT id, location_id FROM users WHERE email = $1', [u.email]
      );
      if (exists) {
        if (u.locationQuery && !exists.location_id) {
          const { rows: [loc] } = await client.query(u.locationQuery);
          if (loc?.id) {
            await client.query('UPDATE users SET location_id = $1 WHERE id = $2', [loc.id, exists.id]);
            console.log(`   📍 Assigned location_id=${loc.id} to ${u.email}`);
          }
        } else {
          console.log(`   ⏭  ${u.email} already exists, skipping`);
        }
        continue;
      }

      const { rows: [role] } = await client.query(
        'SELECT id FROM roles WHERE name = $1', [u.role]
      );
      if (!role) {
        console.warn(`   ⚠  Role '${u.role}' not found, skipping ${u.email}`);
        continue;
      }

      let location_id = null;
      if (u.locationQuery) {
        const { rows: [loc] } = await client.query(u.locationQuery);
        location_id = loc?.id || null;
        if (location_id) console.log(`   📍 Assigned location_id=${location_id} to ${u.email}`);
        else             console.warn(`   ⚠  No location found for ${u.email}`);
      }

      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        'INSERT INTO users (email, password_hash, full_name, role_id, location_id) VALUES ($1,$2,$3,$4,$5)',
        [u.email, hash, u.full_name, role.id, location_id]
      );
      console.log(`   ✓ Created user: ${u.email} (${u.role})`);
    }

    await client.query('COMMIT');
    console.log('✓ Auth seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('× Auth seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAuth();
