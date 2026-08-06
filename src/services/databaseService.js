import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

let mongoClient = null;
let useLocalFallback = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'ai_bookings.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'ai_sessions.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const CALENDAR_BOOKINGS_FILE = path.join(DATA_DIR, 'calendar_bookings.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const NEWSLETTER_SUBSCRIBERS_FILE = path.join(DATA_DIR, 'newsletter_subscribers.json');

function ensureLocalFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const file of [BOOKINGS_FILE, SESSIONS_FILE, CONTACTS_FILE, CALENDAR_BOOKINGS_FILE, ORDERS_FILE, NEWSLETTER_SUBSCRIBERS_FILE]) {
      if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.warn('[DB] Could not create local files:', err.message);
  }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder = uri && (
    uri.includes('YOUR_CLUSTER') ||
    uri.includes('YOUR_DB_USERNAME') ||
    uri.includes('YOUR_DATABASE') ||
    uri.includes('YOUR_')
  );

  if (!uri || isPlaceholder) {
    console.log('[DB] MONGODB_URI not configured or placeholder. Using JSON-file fallback.');
    useLocalFallback = true;
    ensureLocalFiles();
    return;
  }

  try {
    mongoClient = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    await mongoClient.connect();
    console.log('[DB] Connected to MongoDB.');
    useLocalFallback = false;
  } catch (error) {
    console.error('[DB] MongoDB connection failed. Using JSON-file fallback:', error.message);
    useLocalFallback = true;
    ensureLocalFiles();
  }
}

// --- Chatbot Inquiries ---
async function getInquiryCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('chatbot_inquiries');
}

async function getSessionCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('chatbot_sessions');
}

export async function saveAiBooking(inquiry) {
  const fullInquiry = {
    ...inquiry,
    status: 'New Inquiry',
    source: 'AI Chatbot',
    createdAt: new Date().toISOString()
  };

  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const newId = `ai-inq-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId = { ...fullInquiry, id: newId };
    list.unshift(itemWithId);
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2));
    return itemWithId;
  } else {
    const col = getInquiryCollection();
    const result = await col.insertOne(fullInquiry);
    return { ...fullInquiry, id: result.insertedId.toString() };
  }
}

export async function getAiBookings() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
  }
  try {
    const col = getInquiryCollection();
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    console.error('[DB] getAiBookings error:', err.message);
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
  }
}

export async function updateAiBookingStatus(id, status) {
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2));
      return true;
    }
    return false;
  }
  try {
    const col = getInquiryCollection();
    const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    return result.modifiedCount > 0;
  } catch (err) {
    console.error('[DB] updateAiBookingStatus error:', err.message);
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2));
      return true;
    }
    return false;
  }
}

export async function deleteAiBooking(id) {
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const filtered = list.filter(item => item.id !== id);
    if (filtered.length < list.length) {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(filtered, null, 2));
      return true;
    }
    return false;
  }
  try {
    const col = getInquiryCollection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } catch (err) {
    console.error('[DB] deleteAiBooking error:', err.message);
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const filtered = list.filter(item => item.id !== id);
    if (filtered.length < list.length) {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(filtered, null, 2));
      return true;
    }
    return false;
  }
}

// --- Chat Sessions ---
export async function logAiMessage(sessionId, message, clientName) {
  const timestamp = new Date().toISOString();
  const chatMsg = { role: message.role, content: message.content, timestamp };

  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const idx = list.findIndex(s => s.sessionId === sessionId);

    if (idx !== -1) {
      list[idx].messages.push(chatMsg);
      list[idx].updatedAt = timestamp;
      if (clientName) list[idx].clientName = clientName;
      const updatedItem = list.splice(idx, 1)[0];
      list.unshift(updatedItem);
    } else {
      list.unshift({
        sessionId,
        clientName: clientName || undefined,
        messages: [chatMsg],
        bookingCreated: false,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
  } else {
    try {
      const col = getSessionCollection();
      const updateData = {
        $push: { messages: chatMsg },
        $set: { updatedAt: timestamp },
        $setOnInsert: { createdAt: timestamp, bookingCreated: false }
      };
      if (clientName) updateData.$set.clientName = clientName;
      await col.updateOne({ sessionId }, updateData, { upsert: true });
    } catch (err) {
      console.error('[DB] logAiMessage error:', err.message);
      ensureLocalFiles();
      const list = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const sIdx = list.findIndex(s => s.sessionId === sessionId);
      if (sIdx !== -1) {
        list[sIdx].messages.push(chatMsg);
        list[sIdx].updatedAt = timestamp;
        if (clientName) list[sIdx].clientName = clientName;
      } else {
        list.unshift({ sessionId, clientName: clientName || undefined, messages: [chatMsg], bookingCreated: false, createdAt: timestamp, updatedAt: timestamp });
      }
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
    }
  }
}

export async function setBookingCreated(sessionId, clientName) {
  const timestamp = new Date().toISOString();
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const idx = list.findIndex(s => s.sessionId === sessionId);
    if (idx !== -1) {
      list[idx].bookingCreated = true;
      list[idx].updatedAt = timestamp;
      if (clientName) list[idx].clientName = clientName;
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
    }
  } else {
    try {
      const col = getSessionCollection();
      const updatePayload = { $set: { bookingCreated: true, updatedAt: timestamp } };
      if (clientName) updatePayload.$set.clientName = clientName;
      await col.updateOne({ sessionId }, updatePayload);
    } catch (err) {
      console.error('[DB] setBookingCreated error:', err.message);
      ensureLocalFiles();
      const list = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const idx = list.findIndex(s => s.sessionId === sessionId);
      if (idx !== -1) {
        list[idx].bookingCreated = true;
        list[idx].updatedAt = timestamp;
        if (clientName) list[idx].clientName = clientName;
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
      }
    }
  }
}

export async function getAiSessions() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  }
  try {
    const col = getSessionCollection();
    const docs = await col.find({}).sort({ updatedAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    console.error('[DB] getAiSessions error:', err.message);
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  }
}

// --- Contacts ---
async function getContactsCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('contacts');
}

export async function saveContactInquiry(inquiry) {
  const fullContact = { ...inquiry, status: 'new', createdAt: new Date().toISOString() };
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
    const newId = `c-inq-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId = { ...fullContact, id: newId };
    list.unshift(itemWithId);
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2));
    return itemWithId;
  }
  const col = getContactsCollection();
  const result = await col.insertOne(fullContact);
  return { ...fullContact, id: result.insertedId.toString() };
}

export async function getContactInquiries() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
  }
  try {
    const col = getContactsCollection();
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
  }
}

// --- Calendar Bookings ---
async function getCalendarBookingsCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('bookings');
}

export async function saveCalendarBooking(booking) {
  const fullBooking = { ...booking, status: 'pending', createdAt: new Date().toISOString() };
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(CALENDAR_BOOKINGS_FILE, 'utf-8'));
    const newId = `cal-bk-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId = { ...fullBooking, id: newId };
    list.unshift(itemWithId);
    fs.writeFileSync(CALENDAR_BOOKINGS_FILE, JSON.stringify(list, null, 2));
    return itemWithId;
  }
  const col = getCalendarBookingsCollection();
  const result = await col.insertOne(fullBooking);
  return { ...fullBooking, id: result.insertedId.toString() };
}

export async function getCalendarBookings() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(CALENDAR_BOOKINGS_FILE, 'utf-8'));
  }
  try {
    const col = getCalendarBookingsCollection();
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(CALENDAR_BOOKINGS_FILE, 'utf-8'));
  }
}

// --- Orders ---
async function getOrdersCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('orders');
}

export async function saveCateringOrder(order) {
  const fullOrder = { ...order, status: 'pending', createdAt: new Date().toISOString() };
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    const newId = `ord-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId = { ...fullOrder, id: newId };
    list.unshift(itemWithId);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2));
    return itemWithId;
  }
  const col = getOrdersCollection();
  const result = await col.insertOne(fullOrder);
  return { ...fullOrder, id: result.insertedId.toString() };
}

export async function getCateringOrders() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  }
  try {
    const col = getOrdersCollection();
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  }
}

// --- Newsletter ---
async function getNewsletterCollection() {
  if (!mongoClient) throw new Error('Database client not initialized');
  return mongoClient.db('eveng_catering').collection('newsletter_subscribers');
}

export async function saveNewsletterSubscriber(email) {
  const subscriber = { email, createdAt: new Date().toISOString() };
  if (useLocalFallback) {
    ensureLocalFiles();
    const list = JSON.parse(fs.readFileSync(NEWSLETTER_SUBSCRIBERS_FILE, 'utf-8'));
    const newId = `sub-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId = { ...subscriber, id: newId };
    list.unshift(itemWithId);
    fs.writeFileSync(NEWSLETTER_SUBSCRIBERS_FILE, JSON.stringify(list, null, 2));
    return itemWithId;
  }
  const col = getNewsletterCollection();
  const result = await col.insertOne(subscriber);
  return { ...subscriber, id: result.insertedId.toString() };
}

export async function getNewsletterSubscribers() {
  if (useLocalFallback) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(NEWSLETTER_SUBSCRIBERS_FILE, 'utf-8'));
  }
  try {
    const col = getNewsletterCollection();
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({ ...doc, id: doc._id.toString(), _id: undefined }));
  } catch (err) {
    ensureLocalFiles();
    return JSON.parse(fs.readFileSync(NEWSLETTER_SUBSCRIBERS_FILE, 'utf-8'));
  }
}
