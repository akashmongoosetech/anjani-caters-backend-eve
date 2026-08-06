import { saveAiBooking, getAiBookings, updateAiBookingStatus, deleteAiBooking, getAiSessions, logAiMessage, setBookingCreated } from '../services/databaseService.js';
import { sendChatbotBookingConfirmation } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

export async function createChatbotBooking(req, res) {
  try {
    const { sessionId, ...bookingDetails } = req.body;
    if (!bookingDetails.name || !bookingDetails.email || !bookingDetails.mobile) {
      return res.status(400).json({ error: 'Name, email, and mobile are required booking fields.' });
    }

    const saved = await saveAiBooking(bookingDetails);

    sendChatbotBookingConfirmation(bookingDetails).catch((err) => {
      console.error('Async chatbot confirmation email failed:', err);
    });

    createNotificationHelper({
      title: '🤖 AI Chatbot Booking Request',
      message: `New AI chatbot booking request received from ${bookingDetails.name} for ${bookingDetails.eventType || 'Event'} on ${bookingDetails.eventDate || 'TBD'}.`,
      type: 'Chatbot',
      icon: 'Bot',
      priority: 'High',
      relatedModule: 'Chatbot',
      relatedRecordId: saved.id || 'AI-BOOK',
      actionUrl: '/admin/bookings',
      createdBy: 'AI Concierge'
    }).catch(err => console.error('Chatbot notification creation failed:', err));

    if (sessionId) {
      await setBookingCreated(sessionId, bookingDetails.name);
      await logAiMessage(
        sessionId,
        {
          role: 'model',
          content: `[System Notification: Booking Request submitted successfully via Chatbot Form. Contact Name: ${bookingDetails.name}, Event: ${bookingDetails.eventType} on ${bookingDetails.eventDate} for ${bookingDetails.guests} guests. Budget: ₹${bookingDetails.budget}]`
        },
        bookingDetails.name
      );
    }

    return res.status(201).json({ success: true, booking: saved });
  } catch (error) {
    console.error('Error saving chatbot booking:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function getAllChatbotBookings(req, res) {
  try {
    const bookings = await getAiBookings();
    return res.json(bookings);
  } catch (error) {
    console.error('Error fetching chatbot bookings:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function updateChatbotBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }

    const updated = await updateAiBookingStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Booking not found or not modified.' });
    }

    return res.json({ success: true, message: 'Status updated successfully.' });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function deleteChatbotBooking(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deleteAiBooking(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.json({ success: true, message: 'Booking deleted successfully.' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function getChatSessions(req, res) {
  try {
    const sessions = await getAiSessions();
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat session logs:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
