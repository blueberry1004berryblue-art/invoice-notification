const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const path = require('path');
const app = express();

// 先ほど取得したキーをここに設定（Renderの環境変数から読み込む設定）
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(express.json());
app.use(express.static('public'));

let subscriptions = []; 

// 購読保存API
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  // テスト用に現在時刻から10分後に「当日」が来るように設定
  const testDate = new Date();
  subscriptions.push({ sub: subscription, invoiceDate: testDate });
  res.status(201).json({});
});

// 通知送信関数
const sendNotification = (sub, title, body, url) => {
  const payload = JSON.stringify({ title, body, url });
  webpush.sendNotification(sub, payload).catch(err => console.error("送信失敗:", err));
};

// スケジュール実行（1分ごとにチェック）
cron.schedule('* * * * *', () => {
  const now = new Date();
  subscriptions.forEach(user => {
    // ここに「2ヶ月前」などの条件を書きますが、まずはテストで即時送る設定
    sendNotification(user.sub, "請求書の確認", "PDFはこちらから", "https://invoice-notification.onrender.com/your-inboice");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));