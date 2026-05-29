const mongoose = require('mongoose');
const { redis } = require('../src/config/redis');

const TEST_MONGO_URI = process.env.MONGO_URI?.replace('placementos', 'placementos_test')
  || 'mongodb://localhost:27017/placementos_test';

const connectTestDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Test DB connected');
};

const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  // close redis so Jest can exit cleanly
  await redis.quit();
};

module.exports = { connectTestDB, clearTestDB, closeTestDB };