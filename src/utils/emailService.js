import nodemailer from 'nodemailer';

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured. Using streamTransport fallback.');
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
  }

  return transporter;
}

function formatSmtpError(error) {
  const parts = [`code=${error.code || 'unknown'}`];
  if (error.responseCode) parts.push(`responseCode=${error.responseCode}`);
  if (error.response) parts.push(`response=${error.response}`);
  if (error.command) parts.push(`command=${error.command}`);
  parts.push(`message=${error.message || ''}`);
  return parts.join(' ');
}

function getSenderFrom() {
  if (process.env.SMTP_FROM) {
    if (process.env.SMTP_USER) {
      const fromMatch = process.env.SMTP_FROM.match(/<([^>]+)>/);
      const fromEmail = fromMatch ? fromMatch[1].trim().toLowerCase() : process.env.SMTP_FROM.trim().toLowerCase();
      const smtpUser = process.env.SMTP_USER.trim().toLowerCase();
      if (fromEmail && fromEmail !== smtpUser) {
        console.warn(`[Email] SMTP_FROM address (${fromEmail}) does not match SMTP_USER (${process.env.SMTP_USER}); using SMTP_USER as sender.`);
        return `"Anjani Catering & Events" <${process.env.SMTP_USER}>`;
      }
    }
    return process.env.SMTP_FROM;
  }
  if (process.env.SMTP_USER) return `"Anjani Catering & Events" <${process.env.SMTP_USER}>`;
  return '"Anjani Catering & Events" <sales@anjanievents.in>';
}

export function logSmtpHealth() {
  const vars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'ADMIN_EMAIL'];
  vars.forEach((v) => {
    console.log(`[Email] Env ${v}: ${process.env[v] ? 'loaded' : 'MISSING'}`);
  });

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const mode = host && user && pass ? 'real SMTP' : 'streamTransport (emails NOT delivered)';
  console.log(`[Email] SMTP health: mode=${mode} host=${host || '(none)'} port=${port} from=${getSenderFrom()}`);
  if (mode === 'real SMTP') {
    const t = getTransporter();
    t.verify()
      .then(() => console.log('[Email] SMTP health: verify() OK - credentials accepted by mail server.'))
      .catch((err) => console.error(`[Email] SMTP health: verify() FAILED - ${formatSmtpError(err)}`));
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendMail({ to, subject, html, text }) {
  const cleanTo = String(to || '').replace(/[\r\n]/g, '').trim();
  console.log(`[EMAIL] Sending -> ${cleanTo} | Subject: "${subject}"`);
  try {
    const mailTransporter = getTransporter();
    const from = getSenderFrom();
    const info = await mailTransporter.sendMail({
      from,
      to: cleanTo,
      subject,
      html,
      text: text || 'Thank you for contacting Anjani Catering & Events.'
    });
    console.log(`[EMAIL SUCCESS] Message ID: ${info.messageId} -> ${cleanTo} | Subject: "${subject}"`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL FAILED] -> ${cleanTo} | Subject: "${subject}" | ${formatSmtpError(error)}`);
    return { success: false, error: error.message };
  }
}

export async function sendBookingAckEmail(bookingData) {
  if (!bookingData || !bookingData.email) return false;
  const reference = bookingData.bookingReference || `BK-${(bookingData._id || '').toString().slice(-6).toUpperCase()}`;
  const eventDate = new Date(bookingData.eventDate);
  const eventDateStr = !isNaN(eventDate.getTime())
    ? eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBD';
  const subject = `Booking Confirmation Received: Ref #${reference}`;
  const html = generateHtmlTemplate({
    customerName: bookingData.fullName || 'Valued Guest',
    subject,
    mainTitle: 'Thank you for your booking request',
    mainMessage: `Thank you for choosing Anjani Catering & Events! We have successfully received your reservation inquiry for your upcoming <strong>${escapeHtml(bookingData.eventType || 'Event')}</strong>. Our banqueting concierge is reviewing your request.`,
    summaryFields: [
      { label: 'Booking Reference', value: `#${reference}` },
      { label: 'Event Date & Time', value: `${eventDateStr} at ${bookingData.eventTime || '12:00 PM'}` },
      { label: 'Guest Count', value: `${bookingData.guestCount || 1} Guests` },
      { label: 'Preferred Cuisine', value: bookingData.preferredCuisine || 'Multi-Cuisine' },
      { label: 'Catering Package', value: bookingData.cateringPackage || 'Royal Buffet' },
      { label: 'Venue Location', value: `${bookingData.venueAddress || 'Venue'}${bookingData.city ? `, ${bookingData.city}` : ''}` }
    ],
    nextSteps: [
      'Our Executive Banquet Manager will check date slot availability on our central calendar.',
      'A dedicated concierge will contact you within 2 business hours to verify menu selections.',
      'We will schedule a complimentary food tasting session at our master kitchen.'
    ],
    ctaText: 'Visit Our Website',
    ctaUrl: 'https://anjanievents.in',
    socials: [
      { label: 'Facebook', url: 'https://www.facebook.com/anjanieventscatering/' },
      { label: 'Instagram', url: 'https://www.instagram.com/anjani_events__/' }
    ]
  });
  return sendMail({ to: bookingData.email, subject, html });
}

export async function sendContactAckEmail(contactData) {
  if (!contactData || !contactData.email) return false;
  const reference = contactData.reference || `ANJ-${(contactData._id || '').toString().slice(-6).toUpperCase()}`;
  const submittedOn = new Date(contactData.createdAt || new Date()).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
  const subject = `Inquiry Received – Ref #${reference}`;
  const summaryFields = [
    { label: 'Inquiry Reference', value: `#${reference}` },
    { label: 'Name', value: contactData.name },
    { label: 'Email', value: contactData.email }
  ];
  if (contactData.phone) summaryFields.push({ label: 'Mobile Number', value: contactData.phone });
  if (contactData.eventType) summaryFields.push({ label: 'Event Type', value: contactData.eventType });
  if (contactData.eventDate) summaryFields.push({ label: 'Target Event Date', value: contactData.eventDate });
  if (contactData.guestCount) summaryFields.push({ label: 'Guest Count', value: `${contactData.guestCount} Guests` });
  if (contactData.message) summaryFields.push({ label: 'Inquiry Message', value: contactData.message });
  summaryFields.push({ label: 'Submitted On', value: submittedOn });

  const html = generateHtmlTemplate({
    customerName: contactData.name || 'Valued Guest',
    subject,
    mainTitle: 'Thank you for contacting us',
    mainMessage: 'We have successfully received your inquiry. Our event planning team is already reviewing your preferences, and a dedicated coordinator will contact you shortly with a customized catering proposal.',
    summaryFields,
    nextSteps: [
      'Our customer support team will analyze your specific inquiry and dietary preferences.',
      'An event coordinator will reach out to provide customized package recommendations and pricing options.',
      'We will schedule a personal consultation to tailor every culinary detail of your event.'
    ],
    ctaText: 'Visit Our Website',
    ctaUrl: 'https://anjanievents.in',
    socials: [
      { label: 'Facebook', url: 'https://www.facebook.com/anjanieventscatering/' },
      { label: 'Instagram', url: 'https://www.instagram.com/anjani_events__/' }
    ]
  });
  return sendMail({ to: contactData.email, subject, html });
}

// --- Frontend merged rich template system ---

function generateHtmlTemplate({ customerName, subject, mainTitle, mainMessage, summaryFields, nextSteps, ctaText = 'Visit Our Website', ctaUrl = 'https://anjanievents.in', socials = [] }) {
  const summaryRowsHtml = summaryFields
    .map(
      (f) => `
      <tr>
        <td style="padding: 10px 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 13px; font-weight: bold; color: #1F3E29; border-bottom: 1px solid #ECE7DE; width: 150px; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(f.label)}</td>
        <td style="padding: 10px 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 13px; color: #1A1A1A; border-bottom: 1px solid #ECE7DE;">${escapeHtml(f.value)}</td>
      </tr>`
    )
    .join('');

  const nextStepsHtml = nextSteps
    .map(
      (step, idx) => `
      <li style="margin-bottom: 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 13px; color: #1A1A1A; line-height: 1.6;">
        <strong style="color: #D49A5B; margin-right: 4px;">0${idx + 1}.</strong> ${escapeHtml(step)}
      </li>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="background-color: #FDFBF7; padding: 40px 15px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #EAE5DB; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(31,62,41,0.04);">
        <tr>
          <td align="center" style="background-color: #1F3E29; padding: 35px 40px; border-bottom: 4px solid #D49A5B;">
            <div style="display: inline-block; width: 44px; height: 44px; border-radius: 50%; background-color: #D49A5B; text-align: center; line-height: 44px; margin-bottom: 12px; color: #1F3E29; font-weight: bold; font-size: 20px;">अ</div>
            <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 4px; text-transform: uppercase;">ANJANI CATERING & EVENTS</h1>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #D49A5B; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Bespoke Culinary Experiences</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 40px 30px 40px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 25px;">
                  <h2 style="margin: 0 0 16px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #1F3E29;">Hello ${escapeHtml(customerName)},</h2>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4A5568;">${mainMessage}</p>
                </td>
              </tr>
              ${summaryFields.length > 0 ? `
              <tr>
                <td style="padding-bottom: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F4EE; border: 1px solid #ECE7DE; border-radius: 16px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px 20px; background-color: #ECE7DE; border-bottom: 1px solid #ECE7DE;">
                        <h3 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: bold; color: #1F3E29; text-transform: uppercase; letter-spacing: 1px;">Submitted Details Summary</h3>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 20px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">${summaryRowsHtml}</table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding: 24px; background-color: #FDFBF7; border: 1px dashed #D49A5B; border-radius: 16px; margin-bottom: 30px;">
                  <h3 style="margin: 0 0 14px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: bold; color: #1F3E29;">What Happens Next?</h3>
                  <ul style="margin: 0; padding: 0; list-style: none;">${nextStepsHtml}</ul>
                </td>
              </tr>
              <tr><td style="height: 25px;"></td></tr>
              <tr>
                <td align="center" style="padding-bottom: 15px;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="border-radius: 12px; background-color: #D49A5B;">
                        <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 13px; font-weight: bold; color: #1F3E29; text-decoration: none; border-radius: 12px; border: 1px solid #D49A5B; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(ctaText)}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; background-color: #FDFBF7; border-top: 1px solid #ECE7DE; border-bottom: 1px solid #ECE7DE;">
            <h4 style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 13px; font-weight: bold; color: #1F3E29; text-transform: uppercase; letter-spacing: 1px;">Direct Concierge Assistance</h4>
            <p style="margin: 0; font-size: 12px; color: #555555; line-height: 1.5;">
              Phone: <strong>+91-9685533878</strong> (9:00 AM - 6:00 PM)<br>
              Email: <a href="mailto:sales@anjanievents.in" style="color: #D49A5B; text-decoration: none; font-weight: 600;">sales@anjanievents.in</a><br>
              Website: <a href="${escapeHtml(ctaUrl)}" style="color: #D49A5B; text-decoration: none; font-weight: 600;">www.anjanievents.in</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 30px 40px; background-color: #1F3E29; color: #A0AEC0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #D49A5B;">ANJANI CATERING & EVENTS INC.</p>
            <p style="margin: 0 0 15px 0;">Maharastra Marg, Rani ki Bagiya, Chhatarpur, Madhya Pradesh 471001</p>
            ${socials.length > 0 ? `
            <p style="margin: 0 0 15px 0;">
              ${socials.map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" style="display: inline-block; margin: 0 6px; padding: 8px 18px; background-color: rgba(212,154,91,0.15); color: #D49A5B; text-decoration: none; border-radius: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(s.label)}</a>`).join('')}
            </p>` : ''}
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Anjani Catering & Events. All Rights Reserved.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
}

async function safeSendMail(to, subject, html, formType) {
  const cleanTo = String(to || '').replace(/[\r\n]/g, '').trim();
  console.log(`[EMAIL] Sending [${formType}] -> ${cleanTo} | Subject: "${subject}"`);
  try {
    const transporter = getTransporter();
    const from = getSenderFrom();
    const cleanSubject = String(subject || '').replace(/[\r\n]/g, '').trim();

    const info = await transporter.sendMail({ from, to: cleanTo, subject: cleanSubject, html });

    if (transporter.options && transporter.options.streamTransport) {
      console.log(`[EMAIL SIMULATION] Subject: "${cleanSubject}"`);
      console.log(`[EMAIL SIMULATION] Sent to: ${cleanTo}`);
    }

    console.log(`[EMAIL SUCCESS] [${formType}] Message ID: ${info.messageId} -> ${cleanTo}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL FAILED] [${formType}] -> ${cleanTo} | ${formatSmtpError(error)}`);
    return { success: false, error: error.message };
  }
}

export async function sendBookingConfirmation(data) {
  const subject = "We've Received Your Catering Inquiry";
  const mainMessage = 'Thank you for your catering booking request. Our team has received your date details and event hold requirements. Sarah, our coordinating banquet manager, will check the slot availability and finalize your custom package details shortly.';
  const summaryFields = [{ label: 'Name', value: data.name }, { label: 'Email', value: data.email }, { label: 'Selected Date', value: data.date }];
  if (data.notes) summaryFields.push({ label: 'Special Notes', value: data.notes });
  const html = generateHtmlTemplate({
    customerName: data.name, subject, mainTitle: 'Thank you for your catering inquiry', mainMessage, summaryFields,
    nextSteps: ['We will verify schedule openings for your requested date in our calendar.', 'A catering representative will reach out to outline culinary themes and finalize guests ratio.', 'We will schedule an exclusive tasting session at our gourmet kitchen.', 'We will lock in the pre-hold once a formal deposit is authorized.']
  });
  return safeSendMail(data.email, subject, html, 'Booking Form');
}

export async function sendOrderConfirmation(data) {
  const subject = 'Thank You! Your Request Has Been Received';
  const mainMessage = 'Thank you for submitting your custom catering order request. We are thrilled to handle your gourmet preparation. Our chefs will review the kitchen capacity for your event date and get back to you with invoice details.';
  const summaryFields = [{ label: 'Customer Name', value: data.name }, { label: 'Email', value: data.email }, { label: 'Selected Service/Layout', value: data.serviceName }];
  if (data.phone) summaryFields.push({ label: 'Mobile Number', value: data.phone });
  if (data.address) summaryFields.push({ label: 'Delivery/Venue Address', value: data.address });
  if (data.orderItems) summaryFields.push({ label: 'Catering Details', value: data.orderItems });
  if (data.total) summaryFields.push({ label: 'Estimated Invoice', value: `₹${data.total}` });
  const html = generateHtmlTemplate({
    customerName: data.name, subject, mainTitle: 'Catering Order Request Received', mainMessage, summaryFields,
    nextSteps: ['Our Master Chefs will verify standard ingredient prep pipelines for your selection.', 'An invoice coordinator will call you to authorize payment options.', 'Your live food counters or service staff staffing assignments will be confirmed.', 'A fresh, hot gourmet delivery plan or silver-service setup timeline will be locked in.']
  });
  return safeSendMail(data.email, subject, html, 'Order Form');
}

export async function sendChatbotBookingConfirmation(data) {
  const subject = "Thanks for Your Catering Request";
  const mainMessage = 'Thank you for utilizing our AI Culinary Concierge. We have successfully registered your customized catering details. Our gourmet kitchen managers and menu planners have received your dynamic preferences and will prepare a tailored proposal package for you.';
  const summaryFields = [
    { label: 'Customer Name', value: data.name },
    { label: 'Email Address', value: data.email },
    { label: 'Mobile Number', value: data.mobile },
    { label: 'Event Type', value: data.eventType },
    { label: 'Target Event Date', value: data.eventDate },
    { label: 'Guest Count', value: String(data.guests) },
    { label: 'Preferred Cuisine', value: data.preferredCuisine },
    { label: 'Catering Budget', value: `₹${data.budget}` },
    { label: 'Venue Address', value: `${data.venueAddress}, ${data.city}` }
  ];
  if (data.specialRequirements) summaryFields.push({ label: 'Dietary / Special Requirements', value: data.specialRequirements });
  const html = generateHtmlTemplate({
    customerName: data.name, subject, mainTitle: 'Thank you for using our AI Catering Assistant', mainMessage, summaryFields,
    nextSteps: ['Our culinary team will review the cuisine, portion weights, and layout options you shared.', 'Sarah, our coordinating event coordinator, will verify logistics for your venue location.', 'A custom menu proposal matching your specific budget and dietary rules will be designed.', 'We will coordinate a final phone consultation or schedule a private kitchen visit.']
  });
  return safeSendMail(data.email, subject, html, 'Chatbot Booking');
}

export async function sendProductInquiryConfirmation(data) {
  const subject = "We've Received Your Custom Inquiry";
  const mainMessage = 'Thank you for inquiring about our signature menu items and live counters. We have received your query, and our kitchen team will provide detailed ingredient, customization, and allergen information shortly.';
  const summaryFields = [{ label: 'Client Name', value: data.name }, { label: 'Email Address', value: data.email }, { label: 'Dishes/Topic', value: data.productName }, { label: 'Message Notes', value: data.message }];
  if (data.phone) summaryFields.push({ label: 'Phone Number', value: data.phone });
  const html = generateHtmlTemplate({
    customerName: data.name, subject, mainTitle: 'Menu Customization Inquiry Received', mainMessage, summaryFields,
    nextSteps: ['Our kitchen coordinators will review spice limits and Jain/Vegetarian rules for these dishes.', 'We will check seasonal availability of special ingredients.', 'We will outline customized live-station configurations for your event theme.']
  });
  return safeSendMail(data.email, subject, html, 'Product Inquiry');
}

export async function sendQuoteRequestConfirmation(data) {
  const subject = 'Your Custom Catering Quote Request Is Received';
  const mainMessage = 'Thank you for requesting a customized catering proposal quote from Anjani Catering & Events. Our gourmet planning representatives are checking wait-staff layouts and service estimates for your gathering.';
  const summaryFields = [{ label: 'Client Name', value: data.name }, { label: 'Email Address', value: data.email }, { label: 'Notes/Briefing', value: data.message }];
  if (data.phone) summaryFields.push({ label: 'Mobile Phone', value: data.phone });
  if (data.eventType) summaryFields.push({ label: 'Event Category', value: data.eventType });
  if (data.guests) summaryFields.push({ label: 'Guest Count', value: String(data.guests) });
  const html = generateHtmlTemplate({
    customerName: data.name, subject, mainTitle: 'Bespoke Quote Proposal Initialized', mainMessage, summaryFields,
    nextSteps: ['We will evaluate direct wait-staff, mixologists, and layout costs for your volume.', 'We will prepare an elegant, itemized pricing breakdown for food and rentals.', 'We will call you to optimize menu course sequences and adjust price estimates.']
  });
  return safeSendMail(data.email, subject, html, 'Quote Request');
}

export async function sendNewsletterConfirmation(email) {
  const subject = 'Welcome to Anjani Catering & Events Culinary Inspiration!';
  const mainMessage = 'Thank you for joining the Anjani Catering & Events exclusive newsletter network! You are now locked in to receive our monthly gourmet inspirations, seasonal recipe outlines curated by our master chefs, professional banqueting layout tips, and early notifications about tasting sessions.';
  const html = generateHtmlTemplate({
    customerName: 'Gourmet Enthusiast', subject, mainTitle: 'Gourmet newsletter subscription active', mainMessage,
    summaryFields: [{ label: 'Subscriber Email', value: email }],
    nextSteps: ['Keep an eye out for our monthly newsletter issue detailing seasonal menu shifts.', 'Receive exclusive early notifications of private chef tasting events.', 'Gain access to special private discount vouchers for your future catering reservations.']
  });
  return safeSendMail(email, subject, html, 'Newsletter Signup');
}

export async function sendWelcomeEmail(userData, plainPassword) {
  const { name, email, username, role, password } = userData;
  const finalPassword = plainPassword || password || 'Welcome@123';
  const loginUrl = process.env.LOGIN_URL || 'https://anjani-eveng.vercel.app/admin-login';

  const subject = `Welcome to Anjani Catering & Events — Your Account Is Ready`;
  const html = generateHtmlTemplate({
    customerName: name || 'Team Member',
    subject,
    mainTitle: 'Welcome to the Team!',
    mainMessage: `We are delighted to welcome you to <strong>Anjani Catering & Events</strong>. Your administrator account has been successfully created. You can now access the admin control panel to manage catering operations, bookings, menu items, and more.`,
    summaryFields: [
      { label: 'Employee Name', value: name || '' },
      { label: 'Assigned Role', value: role || 'Staff' },
      { label: 'Username', value: username || email },
      { label: 'Login Email', value: email },
      { label: 'Temporary Password', value: finalPassword }
    ],
    nextSteps: [
      'Log in to the admin panel using your email/username and the temporary password above.',
      'You will be prompted to change your password on first login for security purposes.',
      'Explore the dashboard to manage bookings, services, menu items, and client inquiries.',
      'Contact your Super Admin if you need role or permission adjustments.'
    ],
    ctaText: 'Access Admin Panel',
    ctaUrl: loginUrl
  });
  return sendMail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(userData, newPassword) {
  const { name, email } = userData;
  const loginUrl = process.env.LOGIN_URL || 'https://anjani-eveng.vercel.app/admin-login';

  const subject = 'Your Anjani Catering Password Has Been Reset';
  const html = generateHtmlTemplate({
    customerName: name || 'Valued Team Member',
    subject,
    mainTitle: 'Password Reset Successful',
    mainMessage: `Your password for <strong>Anjani Catering & Events</strong> admin panel has been reset by an administrator. Please use the temporary credentials below to log in.`,
    summaryFields: [
      { label: 'Account Email', value: email },
      { label: 'New Password', value: newPassword }
    ],
    nextSteps: [
      'Log in using your email and the new temporary password above.',
      'For security, please change your password immediately after logging in.',
      'If you did not request this reset, please contact your Super Admin right away.'
    ],
    ctaText: 'Log In to Admin Panel',
    ctaUrl: loginUrl
  });
  return sendMail({ to: email, subject, html });
}

export async function sendAdminNotification(formType, data) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: true, bypassed: true };

  const cleanAdmin = adminEmail.replace(/[\r\n]/g, '').trim();
  console.log(`[EMAIL] Sending admin notification [${formType}] -> ${cleanAdmin}`);
  try {
    const transporter = getTransporter();
    const from = getSenderFrom();
    const subject = `[Admin Notification] New submission on ${formType}`;
    const tableRows = Object.entries(data)
      .map(([key, val]) => `
      <tr>
        <td style="padding: 6px 12px; font-weight: bold; border-bottom: 1px solid #ECE7DE; width: 140px; font-size: 12px; color: #1F3E29;">${key}</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid #ECE7DE; font-size: 12px; color: #1A1A1A;">${typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
      </tr>`)
      .join('');
    const html = `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #FDFBF7; padding: 25px; color: #1A1A1A;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #EAE5DB; border-radius: 12px; overflow: hidden; padding: 25px;"><h2 style="color: #1F3E29; border-bottom: 2px solid #D49A5B; padding-bottom: 10px; margin-top: 0;">New Form Submission Alerts</h2><p style="font-size: 13px;">A customer has submitted details on the <strong>${formType}</strong> of the website.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #F7F4EE;">${tableRows}</table><p style="font-size: 11px; color: #555555;">This is an automated system dispatch. Anjani Catering & Events Back-End Control Panel.</p></div></body></html>`;
    await transporter.sendMail({ from, to: cleanAdmin, subject: subject.replace(/[\r\n]/g, '').trim(), html });
    console.log(`[EMAIL SUCCESS] Admin notice [${formType}] -> ${cleanAdmin}`);
    return { success: true };
  } catch (error) {
    console.error(`[EMAIL FAILED] Admin notification [${formType}] -> ${cleanAdmin} | ${formatSmtpError(error)}`);
    return { success: false, error: error.message };
  }
}
