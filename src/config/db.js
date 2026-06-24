const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected!`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Do not crash the process in development/seeding mode if DB is not running, but output instructions
    console.log('Ensure MongoDB is running locally or specify a valid MONGODB_URI in .env');
    process.exit(1);
  }
};

module.exports = connectDB;
