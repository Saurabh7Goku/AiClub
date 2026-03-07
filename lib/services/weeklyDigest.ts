import { getWeeklyDigestData } from './newsService';
import { getAdminDb } from '../firebase/admin';

export async function generateWeeklyDigest() {
    const newsItems = await getWeeklyDigestData();
    if (newsItems.length === 0) {
        console.log('No new intelligence signals for weekly digest.');
        return;
    }

    const db = getAdminDb();
    const usersSnapshot = await db.collection('users')
        .where('digestSubscription', '==', true)
        .get();

    if (usersSnapshot.empty) {
        console.log('No users subscribed to weekly digest.');
        return;
    }

    console.log(`Generating weekly digest for ${usersSnapshot.size} subscribers...`);

    const digestHtml = renderDigestEmail(newsItems);

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        await sendEmail(userData.email, 'Weekly AI Club Intelligence Digest', digestHtml);
    }

    return { sentTo: usersSnapshot.size, itemCount: newsItems.length };
}

function renderDigestEmail(items: any[]) {
    // Simple HTML template for the email
    const itemsHtml = items.map(item => `
        <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #f59e0b; background: #f9fafb;">
            <h3 style="margin: 0 0 5px 0; font-family: sans-serif; text-transform: uppercase;">${item.title}</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;">${item.summary}</p>
            <a href="${item.sourceUrl}" style="color: #f59e0b; font-weight: bold; text-decoration: none; font-size: 12px; text-transform: uppercase;">Read Signal →</a>
        </div>
    `).join('');

    return `
        <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
            <div style="background: #f59e0b; padding: 30px; text-align: center;">
                <h1 style="color: #000; margin: 0; text-transform: uppercase; letter-spacing: 2px;">AI Club Digest</h1>
                <p style="color: #fff; margin: 10px 0 0 0; font-weight: bold; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">WEEKLY INTELLIGENCE REPORT</p>
            </div>
            <div style="padding: 20px;">
                <p>Hello researchers,</p>
                <p>Here are the top technical signals aggregated from the global AI research stream this week:</p>
                ${itemsHtml}
            </div>
            <div style="padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af;">
                &copy; 2026 AiClub AI INNOVATION CLUB | <a href="#" style="color: #9ca3af;">Unsubscribe</a>
            </div>
        </div>
    `;
}

async function sendEmail(to: string, subject: string, html: string) {
    // MOCK EMAIL SENDING
    // In a real app, integrate with Resend, SendGrid, etc.
    console.log(`[EMAIL_MOCK] Sending digest to: ${to}`);
    // console.log(`[EMAIL_MOCK] Subject: ${subject}`);
    // console.log(`[EMAIL_MOCK] HTML: ${html.slice(0, 100)}...`);

    // Placeholder for actual implementation:
    // const res = await resend.emails.send({ from: 'club@AiClub.gov.in', to, subject, html });
}
