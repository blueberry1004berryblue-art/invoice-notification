// あなたの Public Key をここに貼り付けてください
const publicVapidKey = 'BOKvuVIZpdMmbluxKto_Quao_NPpdVGcVpUfXdjEH5tjCFKJQWesiSGQHAU0TwuMIbkpx2TvwGpB2Tq6AX9Nh3o';

// Base64の鍵を変換するための補助関数（コピーしてそのまま使ってください）
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ボタンを押した時の処理
document.getElementById('sub-btn').addEventListener('click', async () => {
  try {
    // 1. Service Workerを登録
    const register = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker 登録成功');

    // 2. 通知の購読を開始
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    console.log('Push購読成功');

    // 3. サーバー(Render)に購読情報を送る
    await fetch('/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'content-type': 'application/json'
      }
    });

    alert('通知の登録が完了しました！1分以内にテスト通知が届きます。');

  } catch (error) {
    console.error('エラー内容:', error);
    alert('エラーが発生しました。設定アプリで通知が許可されているか確認してください。\nエラー: ' + error.message);
  }
});