const Notice = require('../models/Notice');
const { sendNotification } = require('../config/fcm');

/**
 * @desc    Create and publish a Notice
 * @route   POST /api/notices
 * @access  Private (Admin Only)
 */
const createNotice = async (req, res, next) => {
  try {
    const { title, description, targetRole } = req.body;

    if (!['ALL', 'SECURITY', 'RESIDENTS'].includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'Invalid target role target' });
    }

    const notice = new Notice({
      title,
      description,
      createdBy: req.user.id,
      targetRole
    });

    await notice.save();

    // Send push notification to target topic
    await sendNotification({
      title: `📣 Notice: ${title}`,
      body: description.length > 80 ? `${description.substring(0, 77)}...` : description,
      topic: targetRole,
      data: { noticeId: notice._id.toString() }
    });

    res.status(201).json({
      success: true,
      message: 'Notice published successfully.',
      notice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch notices matching role restrictions
 * @route   GET /api/notices
 * @access  Private (Admin, Security, Resident)
 */
const getNotices = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let query = {};

    if (userRole === 'SECURITY') {
      query.targetRole = { $in: ['ALL', 'SECURITY'] };
    } else if (userRole === 'OWNER' || userRole === 'TENANT') {
      query.targetRole = { $in: ['ALL', 'RESIDENTS'] };
    }
    // Admin is unrestricted and can see all notices

    const notices = await Notice.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotice,
  getNotices
};
