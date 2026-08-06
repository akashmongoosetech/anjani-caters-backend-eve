import { saveContactInquiry, saveCalendarBooking, saveCateringOrder } from '../services/databaseService.js';
import { sendContactAckEmail, sendBookingConfirmation, sendOrderConfirmation, sendProductInquiryConfirmation, sendQuoteRequestConfirmation } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

export async function submitContactInquiry(req, res) {
  try {
    const { name, email, phone, eventDate, guests, message, formType, productName, eventType } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required fields.' });
    }

    const contactData = { name, email, phone, eventDate, guests: guests ? String(guests) : undefined, message };
    const saved = await saveContactInquiry(contactData);

    if (formType === 'product-inquiry') {
      sendProductInquiryConfirmation({ name, email, phone, productName: productName || 'Gourmet Dish / Counter Selection', message }).catch(err => {
        console.error('Async product-inquiry confirmation email failed:', err);
      });
    } else if (formType === 'quote-request') {
      sendQuoteRequestConfirmation({ name, email, phone, eventType: eventType || 'Grand Celebration', guests, message }).catch(err => {
        console.error('Async quote-request confirmation email failed:', err);
      });
    } else {
      sendContactAckEmail({ ...contactData, guestCount: guests ? Number(guests) : undefined, reference: saved.reference }).catch(err => {
        console.error('Async contact confirmation email failed:', err);
      });
    }

    const contactDetails = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      eventDate ? `Date: ${eventDate}` : '',
      guests ? `Guests: ${guests}` : '',
      `Message: "${(message || '').slice(0, 80)}..."`
    ].filter(Boolean).join(' | ');

    createNotificationHelper({
      title: '📩 New Contact Inquiry',
      message: contactDetails,
      type: 'Contact',
      icon: 'Mail',
      priority: 'Medium',
      relatedModule: 'Contact',
      relatedRecordId: saved.id,
      actionUrl: '/admin/contacts',
      createdBy: 'Contact Form'
    }).catch(err => console.error('Contact notification creation error:', err));

    return res.status(201).json({ success: true, inquiry: saved });
  } catch (error) {
    console.error('Error saving contact inquiry:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function submitCalendarBooking(req, res) {
  try {
    const { name, email, date, notes } = req.body;
    if (!name || !email || !date) {
      return res.status(400).json({ error: 'Name, email, and date are required fields.' });
    }

    const bookingData = { name, email, date, notes };
    const saved = await saveCalendarBooking(bookingData);

    sendBookingConfirmation(bookingData).catch(err => {
      console.error('Async booking confirmation email failed:', err);
    });

    createNotificationHelper({
      title: '📅 New Booking Received',
      message: `New booking received from ${name} for ${date}.`,
      type: 'Booking',
      icon: 'Calendar',
      priority: 'High',
      relatedModule: 'Booking',
      relatedRecordId: saved.id,
      actionUrl: '/admin/bookings',
      createdBy: 'Booking Form'
    }).catch(err => console.error('Booking notification creation error:', err));

    return res.status(201).json({ success: true, booking: saved });
  } catch (error) {
    console.error('Error saving calendar booking:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

export async function submitCateringOrder(req, res) {
  try {
    const { name, email, phone, address, serviceName, orderItems, total } = req.body;
    if (!name || !email || !serviceName) {
      return res.status(400).json({ error: 'Name, email, and serviceName are required fields.' });
    }

    const orderData = { name, email, phone, address, serviceName, orderItems, total };
    const saved = await saveCateringOrder(orderData);

    sendOrderConfirmation(orderData).catch(err => {
      console.error('Async order confirmation email failed:', err);
    });

    createNotificationHelper({
      title: '🛒 New Catering Order Received',
      message: `New order placed by ${name} for ${serviceName}.`,
      type: 'Order',
      icon: 'ShoppingCart',
      priority: 'High',
      relatedModule: 'Order',
      relatedRecordId: saved.id,
      actionUrl: '/admin/orders',
      createdBy: 'Order Form'
    }).catch(err => console.error('Order notification creation error:', err));

    return res.status(201).json({ success: true, order: saved });
  } catch (error) {
    console.error('Error saving catering order:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
