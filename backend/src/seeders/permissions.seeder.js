require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const { MONGO_URI } = require('../config/env');

const seedPermissions = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const roles = Object.keys(ROLE_PERMISSIONS);

  for (const role of roles) {
    const users = await User.find({ role });
    if (!users.length) {
      console.log(`No users found for role: ${role}`);
      continue;
    }

    // reset permissions to role defaults (clears any stale custom ones)
    await User.updateMany({ role }, { $set: { permissions: [] } });
    console.log(`Seeded permissions for ${users.length} [${role}] users`);
  }

  console.log('Permission seeder done');
  process.exit(0);
};

seedPermissions().catch((err) => {
  console.log('Seeder error:', err.message);
  process.exit(1);
});