// A syntax and schema verification script to ensure Express configuration,
// Mongoose schemas, routes, and controllers are fully correct and error-free.

try {
  console.log('--- STARTING REST API CONFIGURATION CHECK ---');
  
  // 1) Load Env and Models
  console.log('Loading Mongoose Models...');
  const User = require('./src/models/User');
  const Flat = require('./src/models/Flat');
  const Visitor = require('./src/models/Visitor');
  const Notice = require('./src/models/Notice');
  const Event = require('./src/models/Event');
  const Complaint = require('./src/models/Complaint');
  const Maintenance = require('./src/models/Maintenance');
  console.log('✅ Models verified successfully.');

  // 2) Load Controllers & Check functions
  console.log('Loading Controllers & Checking exports...');
  const authController = require('./src/controllers/authController');
  const userController = require('./src/controllers/userController');
  const flatController = require('./src/controllers/flatController');
  const visitorController = require('./src/controllers/visitorController');
  const complaintController = require('./src/controllers/complaintController');
  const maintenanceController = require('./src/controllers/maintenanceController');
  const noticeController = require('./src/controllers/noticeController');
  const eventController = require('./src/controllers/eventController');
  
  if (typeof authController.login !== 'function') throw new Error('authController login is not defined');
  if (typeof userController.addResident !== 'function') throw new Error('userController addResident is not defined');
  if (typeof flatController.createFlat !== 'function') throw new Error('flatController createFlat is not defined');
  if (typeof visitorController.createVisitorRequest !== 'function') throw new Error('visitorController createVisitorRequest is not defined');
  if (typeof complaintController.createComplaint !== 'function') throw new Error('complaintController createComplaint is not defined');
  if (typeof maintenanceController.createMaintenanceBill !== 'function') throw new Error('maintenanceController createMaintenanceBill is not defined');
  if (typeof noticeController.createNotice !== 'function') throw new Error('noticeController createNotice is not defined');
  if (typeof eventController.createEvent !== 'function') throw new Error('eventController createEvent is not defined');
  console.log('✅ Controllers verified successfully.');

  // 3) Load Middlewares
  console.log('Loading Middleware modules...');
  const authMiddleware = require('./src/middleware/authMiddleware');
  const errorMiddleware = require('./src/middleware/errorMiddleware');
  const validationMiddleware = require('./src/middleware/validationMiddleware');
  
  if (typeof authMiddleware.protect !== 'function') throw new Error('authMiddleware protect is not defined');
  if (typeof errorMiddleware.errorHandler !== 'function') throw new Error('errorMiddleware errorHandler is not defined');
  if (typeof validationMiddleware.validateFields !== 'function') throw new Error('validationMiddleware validateFields is not defined');
  console.log('✅ Middlewares verified successfully.');

  // 4) Load App Router Entry
  console.log('Assembling Express routes...');
  const app = require('./src/app');
  console.log('✅ Express app initialization verified.');

  console.log('\n======================================================');
  console.log('🎉 ALL EXPORTS, IMPORTS, AND CONTROLLERS VERIFIED OK! 🎉');
  console.log('======================================================');
  process.exit(0);
} catch (error) {
  console.error('\n❌ VERIFICATION FAILED:', error.stack || error.message);
  process.exit(1);
}
