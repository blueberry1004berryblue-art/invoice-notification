const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const app = express();

// Renderの環境変数からVAPIDキーを読み込む
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(express.json());
app.use(express.static('public'));

// 請求書データを保存する配列
// ※Render無料版は再起動で消えるため、本番はDB推奨
let userInvoices = []; 

// 請求書登録API
app.post('/add-invoice', (req, res) => {
  const { subscription, title, deadline, pdfUrl } = req.body;
  
  // GoogleドライブのURLを直リンクに自動変換するロジック
  let finalPdfUrl = pdfUrl;
  if (pdfUrl.includes('drive.google.com')) {
    const fileId = pdfUrl.split('/d/')[1]?.split('/')[0];
    if (fileId) {
      finalPdfUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }

  userInvoices.push({
    sub: subscription,
    title: title,
    deadline: new Date(deadline),
    pdfUrl: finalPdfUrl,
    sentHistory: [] // 重複送信防止用
  });

  console.log(`登録成功: ${title} (期限: ${deadline})`);
  res.status(201).json({ message: "登録に成功しました" });
});

// 通知送信の共通関数
const sendPush = (sub, title, body, url) => {
  const payload = JSON.stringify({ title, body, url });
  webpush.sendNotification(sub, payload).catch(err => {
    console.error("送信エラー:", err.statusCode);
  });
};

// スケジュール設定：毎日午前10時に全データをチェック
// テスト時は '* * * * *' (1分ごと) に書き換えてください
cron.schedule('0 10 * * *', () => {
  const now = new Date();
  console.log(`チェック開始: ${now.toLocaleString()}`);

  userInvoices.forEach(inv => {
    // 残り日数の計算
    const diffTime = inv.deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 通知を送るタイミングのリスト
    const targetDays = [60, 30, 7, 3, 2, 1, 0];

    if (targetDays.includes(diffDays)) {
      const historyKey = `${inv.title}_${diffDays}`;
      
      // まだその日の通知を送っていない場合のみ送信
      if (!inv.sentHistory.includes(historyKey)) {
        const label = diffDays === 0 ? "本日" : `${diffDays}日前`;
        
        sendPush(
          inv.sub,
          `【${inv.title}】期限の${label}です`,
          `支払い期限は ${inv.deadline.toLocaleDateString('ja-JP')} です。タップしてPDFを確認してください。`,
          inv.pdfUrl
        );
        
        inv.sentHistory.push(historyKey);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));