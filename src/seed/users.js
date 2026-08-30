/**
 * AfDB Beta Backend — User Seed Script
 * 
 * Usage:
 *   node src/seed/users.js
 * 
 * Creates default users for development/testing.
 * Run this after starting MongoDB for the first time or when you need fresh credentials.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/afdb_beta';

const users = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'afdbadmin@yopmail.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    firstName: 'Viewer',
    lastName: 'User',
    email: 'afdbaviewer@yopmail.com',
    password: 'Viewer@123',
    role: 'viewer',
  },
  {
    firstName: 'Manager',
    lastName: 'User',
    email: 'afdbmanager@yopmail.com',
    password: 'Manager@123',
    role: 'staff',
  },
];

async function seed() {
  console.log('Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    await db.collection('users').updateOne(
      { email: u.email },
      {
        $set: {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          passwordHash,
          role: u.role,
          isActive: true,
          mfaEnabled: false,
          loginAttempts: 0,
          passwordChangedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { lockUntil: '' },
      },
      { upsert: true }
    );

    console.log(`  ✓ ${u.email} / ${u.password}  (${u.role})`);
  }

  console.log('\nDone! You can now login at http://localhost:3000/login');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
