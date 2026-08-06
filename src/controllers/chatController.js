import { ChatInquiry } from '../models/ChatInquiry.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const handleChatQuery = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    let responseText = "Welcome to Eveng Catering Concierge! We specialize in bespoke royal banquets, corporate summits, and intimate gourmet gatherings. How may I assist with your upcoming event?";

    const query = (message || '').toLowerCase();
    if (query.includes('price') || query.includes('cost') || query.includes('package')) {
      responseText = "Our gourmet packages start from $75 per guest for luxury cocktail receptions up to $185 per guest for multi-course royal wedding banquets. You can request a personalized quote directly through our Bookings page!";
    } else if (query.includes('menu') || query.includes('food') || query.includes('dish')) {
      responseText = "We offer a rich menu featuring Artisanal European Canapés, Royal Indian Tandoori & Mughlai delicacies, Pan-Asian Dim Sum bars, and Signature Pastry spreads. Check out our Menu page to view our seasonal offerings!";
    } else if (query.includes('contact') || query.includes('phone') || query.includes('email')) {
      responseText = "You can reach our concierge team at +91-9685533878 or sales@anjanievents.in. We operate 24/7 for event reservations.";
    }

    return res.status(200).json(new ApiResponse(200, {
      reply: responseText,
      sessionId: sessionId || `session-${Date.now()}`
    }, 'AI Concierge response generated'));
  } catch (error) {
    next(error);
  }
};

export const getChatLogs = async (req, res, next) => {
  try {
    let logs = await ChatInquiry.find().sort({ createdAt: -1 }).catch(() => []);
    return res.status(200).json(new ApiResponse(200, logs, 'Chat logs fetched'));
  } catch (error) {
    next(error);
  }
};
