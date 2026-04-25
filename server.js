const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const app = express();

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(express.json());
app.use(express.static('public'));

// ==========================================
// 【ここを書き換えるだけでOK！】請求書リスト
// ==========================================
const INVOICE_LIST = [
  {
    title: "モバイルバッテリー貸出",
    deadline: "2026-10-31",
    pdfUrl: "https://drive.google.com/file/d/1PJyAsbQy32zLK5ynS-X_cIri0nsTylFk/view?usp=sharing"
  },
  {
    title: "スマホ設定料金(モバイルSuica)",
    deadline: "2026-05-04",
    pdfUrl: "https://drive.google.com/file/d/14aNz9cfa9KpyGhVozpvq_oumN-QALUJb/view?usp=sharing"
  },
  {
    title: "スマホ設定料金(データ移行など)",
    deadline: "2026-12-25",
    pdfUrl: "https://drive.google.com/file/d/1bG5UItpYqublM93WQ2XApsV1E9kXCGIf/view?usp=sharing" // 追加したければここを増やす
  },
  {
    title: "スマホ設定料金(ショートカットなど)",
    deadline: "2027-01-01",
    pdfUrl: "https://drive.google.com/file/d/1e5ZM4UaZUZ3yi4AKn1yD1OJzD9cwrC6F/view?usp=sharing"
  }
];

// ユーザーの通知登録先を保存する変数（これだけは動的に保存が必要）
let globalSubscription = null;

app.post('/subscribe', (req, res) => {
  globalSubscription = req.body;
  console.log("通知登録を受け付けました");
  res.status(201).json({});
});

// Googleドライブ直リンク変換関数
const getDirectLink = (url) => {
  if (url.includes('drive.google.com')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    return id ? `https://drive.google.com/uc?export=view&id=${id}` : url;
  }
  return url;
};

// 通知送信メイン処理
const checkAndSend = () => {
  if (!globalSubscription) return console.log("登録ユーザーがいません");

  const now = new Date();
  // 日本時間に合わせるための調整（RenderはUTCなので+9時間）
  const today = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  today.setHours(0, 0, 0, 0);

  INVOICE_LIST.forEach(inv => {
    const dDate = new Date(inv.deadline);
    dDate.setHours(0, 0, 0, 0);

    // 残り日数を計算
    const diffDays = Math.round((dDate - today) / (1000 * 60 * 60 * 24));
    
    // 指定のタイミングか判定
    const targetDays = [60, 30, 7, 3, 2, 1, 0];
    
    if (targetDays.includes(diffDays)) {
      const label = diffDays === 0 ? "本日" : `${diffDays}日前`;
      
      const payload = JSON.stringify({
        title: `【${inv.title}】期限の${label}`,
        body: `支払い期限: ${inv.deadline}\nタップしてPDFを確認してください。`,
        url: getDirectLink(inv.pdfUrl)
      });

      webpush.sendNotification(globalSubscription, payload)
        .then(() => console.log(`${inv.title} の通知（${label}）を送信しました`))
        .catch(err => console.error("送信エラー:", err));
    }
  });
};

// 毎日午前10時にチェック（サーバーの時刻設定に注意）
cron.schedule('0 10 * * *', checkAndSend);

// 【おまけ】デプロイ直後やボタンを押した時にテストしたい場合用のエンドポイント
app.get('/test-send', (req, res) => {
  checkAndSend();
  res.send("通知チェックを実行しました。ログを確認してください。");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));