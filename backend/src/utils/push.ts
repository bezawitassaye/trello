import webPush from "web-push";

import pool from "../db";

const publicKey = process.env.VAPID_PUBLIC_KEY!;
const privateKey = process.env.VAPID_PRIVATE_KEY!;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

webPush.setVapidDetails(subject, publicKey, privateKey);

// subscription is { endpoint, keys: { p256dh, auth } }
export async function sendPushToSubscription(subscription: any, payload: any) {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // handle errors (410 = gone => remove subscription)
    throw err;
  }
}

// helper: send push to user by userId (reads DB then sends)
export async function notifyUserById(userId: number, payload: any) {
  const res = await pool.query("SELECT endpoint, keys FROM user_subscriptions WHERE user_id=$1", [userId]);
  for (const row of res.rows) {
    const subscription = { endpoint: row.endpoint, keys: row.keys };
    try {
      await sendPushToSubscription(subscription, payload);
    } catch (e: any) {
      // if subscription is invalid/gone, remove it
      if (e && (e.statusCode === 410 || e.statusCode === 404)) {
        await pool.query("DELETE FROM user_subscriptions WHERE user_id=$1 AND endpoint=$2", [userId, row.endpoint]);
      } else {
        console.error("Push error", e);
      }
    }
  }
}
