const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Flat = require('./src/models/Flat');
const Visitor = require('./src/models/Visitor');
const Notice = require('./src/models/Notice');
const Event = require('./src/models/Event');
const Complaint = require('./src/models/Complaint');
const Maintenance = require('./src/models/Maintenance');

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-apartment';
    console.log(`Connecting to database for seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // 1) Clean database
    console.log('Cleaning existing collection data...');
    await User.deleteMany({});
    await Flat.deleteMany({});
    await Visitor.deleteMany({});
    await Notice.deleteMany({});
    await Event.deleteMany({});
    await Complaint.deleteMany({});
    await Maintenance.deleteMany({});

    console.log('Seeding database with test records...');

    // 2) Create flats
    const flats = await Flat.insertMany([
      { flatNumber: '101', block: 'A', maintenanceAmount: 2500, maintenanceStatus: 'PENDING' },
      { flatNumber: '102', block: 'A', maintenanceAmount: 2500, maintenanceStatus: 'PENDING' },
      { flatNumber: '201', block: 'B', maintenanceAmount: 3000, maintenanceStatus: 'PENDING' },
      { flatNumber: '202', block: 'B', maintenanceAmount: 3000, maintenanceStatus: 'PENDING' }
    ]);
    console.log(`Successfully seeded ${flats.length} flats.`);

    // 3) Create Users (Admin, Security, Residents)
    // Note: User save() hook will hash these passwords
    
    // Admin
    const admin = new User({
      name: 'Secretary Rahul',
      phone: '9999999999',
      email: 'admin@smartapartment.com',
      password: 'admin123',
      role: 'ADMIN'
    });
    await admin.save();

    // Security Guard
    const security = new User({
      name: 'Guard Bahadur',
      phone: '8888888888',
      email: 'security@smartapartment.com',
      password: 'security123',
      role: 'SECURITY'
    });
    await security.save();

    // Owner (Assigned to Flat 101, Block A)
    const owner = new User({
      name: 'Mr. Amit Sharma (Owner)',
      phone: '7777777777',
      email: 'owner@gmail.com',
      password: 'owner123',
      role: 'OWNER',
      flatId: flats[0]._id
    });
    await owner.save();

    // Tenant (Assigned to Flat 201, Block B)
    const tenant = new User({
      name: 'Miss Priya Sen (Tenant)',
      phone: '6666666666',
      email: 'tenant@gmail.com',
      password: 'tenant123',
      role: 'TENANT',
      flatId: flats[2]._id
    });
    await tenant.save();

    // Link Users back to Flats
    await Flat.findByIdAndUpdate(flats[0]._id, { ownerId: owner._id });
    await Flat.findByIdAndUpdate(flats[2]._id, { tenantId: tenant._id });

    console.log('Successfully seeded Users:');
    console.log(`- Admin: Phone: 9999999999 / Pass: admin123`);
    console.log(`- Security: Phone: 8888888888 / Pass: security123`);
    console.log(`- Owner: Phone: 7777777777 / Pass: owner123 (Flat A-101)`);
    console.log(`- Tenant: Phone: 6666666666 / Pass: tenant123 (Flat B-201)`);

    // 4) Seed an initial Notice & Event for demo
    const sampleNotice = new Notice({
      title: 'Water Supply Shutdown',
      description: 'There will be a temporary water supply shutdown on Sunday morning (18th June) from 9:00 AM to 12:00 PM for tank cleaning.',
      createdBy: admin._id,
      targetRole: 'RESIDENTS'
    });
    await sampleNotice.save();

    const sampleEvent = new Event({
      title: 'Yoga Workshop',
      description: 'Morning yoga workshop in the central park. Everyone is welcome to join.',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      location: 'Central Lawn Park',
      createdBy: admin._id
    });
    await sampleEvent.save();

    console.log('Successfully seeded sample notices and events.');
    console.log('Database Seeding Completed Successfully!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error.message);
    process.exit(1);
  }
};

seedData();
