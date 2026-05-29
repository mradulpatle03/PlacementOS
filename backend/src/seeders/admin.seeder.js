require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { MONGO_URI } = require('../config/env');

const seedAdmin = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@placementos.com',
    password: 'Admin@1234',
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  console.log('Admin created:', admin.email);
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.log('Seeder error:', err.message);
  process.exit(1);
});