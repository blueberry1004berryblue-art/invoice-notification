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

// ... (上の共通関数はそのまま)

document.getElementById('sub-btn').addEventListener('click', async () => {
  try {
    const register = await navigator.serviceWorker.register('/sw.js');
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 複数の請求書を登録するテスト（本来はフォームから入力）
    const invoices = [
      { title: "4月分電気代", deadline: "2026-04-30T10:00:00", pdfUrl: "/pdf1.pdf" },
      { title: "5月分家賃", deadline: "2026-05-25T10:00:00", pdfUrl: "/pdf2.pdf" }
    ];

    for (const inv of invoices) {
      await fetch('/add-invoice', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscription,
          title: inv.title,
          deadline: inv.deadline,
          pdfUrl: inv.pdfUrl
        }),
        headers: { 'content-type': 'application/json' }
      });
    }

    alert('全ての請求書の通知登録が完了しました！');
  } catch (error) {
    console.error(error);
  }
});