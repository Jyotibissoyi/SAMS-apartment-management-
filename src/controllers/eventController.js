const Event = require('../models/Event');
const { sendNotification } = require('../config/fcm');

/**
 * @desc    Create a new Community Event
 * @route   POST /api/events
 * @access  Private (Admin Only)
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, location } = req.body;

    const event = new Event({
      title,
      description,
      date,
      location,
      createdBy: req.user.id
    });

    await event.save();

    // Notify residents & staff
    await sendNotification({
      title: `🗓️ New Event: ${title}`,
      body: `Join us on ${new Date(date).toLocaleDateString()} at ${location}. Description: ${description}`,
      topic: 'ALL'
    });

    res.status(201).json({
      success: true,
      message: 'Event scheduled successfully.',
      event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Private (Admin, Security, Residents)
 */
const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name')
      .sort({ date: 1 }); // Ascending date order (closest upcoming events first)

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit scheduled event details
 * @route   PUT /api/events/:id
 * @access  Private (Admin Only)
 */
const updateEvent = async (req, res, next) => {
  try {
    const { title, description, date, location } = req.body;
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (location) event.location = location;

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete scheduled event
 * @route   DELETE /api/events/:id
 * @access  Private (Admin Only)
 */
const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await Event.findByIdAndDelete(eventId);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent
};
