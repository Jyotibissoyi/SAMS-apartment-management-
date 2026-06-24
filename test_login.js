const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    const users = await User.find({});
    console.log('Total users found:', users.length);
    for (const u of users) {
      console.log(`User: ${u.name}, Phone: ${u.phone}, Role: ${u.role}, Hashed Password: ${u.password}`);
      const isOwner123 = await bcrypt.compare('owner123', u.password);
      const isAdmin123 = await bcrypt.compare('admin123', u.password);
      console.log(`  Matches 'owner123': ${isOwner123}`);
      console.log(`  Matches 'admin123': ${isAdmin123}`);
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e);
  }
};

runTest();
