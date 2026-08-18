// api/submit.js

// 폼의 "유입경로" 값(한글) → 분양천국 대시보드가 이해하는 utm_source로 매핑
const SOURCE_TO_UTM_SOURCE = {
  '네이버 검색': 'naver',
  '네이버 블로그': 'naver',
  '네이버 배너광고': 'naver',
  '유튜브': 'youtube',
  '인스타그램': 'instagram',
  '페이스북': 'facebook',
};

async function sendTelegramDirect({ name, phone, type, residence, visit_date, message, source }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables.');
    return;
  }

  const text = `
🔔 [청주 테크노 레이원시티] 신규 상담 예약
━━━━━━━━━━━━━━━━━━━━
■ 성함: ${name || '미입력'}
■ 연락처: ${phone || '미입력'}
■ 관심 평형: ${type || '미입력'}
■ 거주지역: ${residence || '미입력'}
■ 방문희망: ${visit_date || '미입력'}
■ 유입경로: ${source || '미입력'}
━━━━━━━━━━━━━━━━━━━━
■ 상세 문의사항:
${message || '없음'}
`.trim();

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const chatIds = chatId.split(',').map((id) => id.trim()).filter(Boolean);

  await Promise.all(
    chatIds.map(async (id) => {
      try {
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: id, text }),
        });
        const result = await response.json();
        if (!result.ok) {
          console.error(`Telegram API Error for chatId ${id}:`, result);
        }
      } catch (err) {
        console.error(`Fetch error for chatId ${id}:`, err);
      }
    })
  );
}

async function sendToDashboard({ name, phone, type, residence, visit_date, message, source }) {
  const dashboardUrl = process.env.DASHBOARD_INTAKE_URL; // 예: https://bunyang-dashboard.vercel.app/api/leads/intake
  const apiKey = process.env.DASHBOARD_API_KEY; // 현장(레이원시티) 전용 API 키

  if (!dashboardUrl || !apiKey) {
    throw new Error('DASHBOARD_INTAKE_URL 또는 DASHBOARD_API_KEY 환경변수가 없습니다.');
  }

  const combinedMessage = visit_date
    ? `[방문희망: ${visit_date}] ${message || ''}`.trim()
    : (message || '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(dashboardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        name,
        phone,
        pyeong_type: type,
        region: residence,
        message: combinedMessage,
        utm_source: SOURCE_TO_UTM_SOURCE[source] || 'other',
        utm_medium: 'landing_form',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Dashboard intake failed: ${response.status} ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const formData = req.body;

    // 분양천국 대시보드로 전송 (리드 저장 + 텔레그램 알림을 대시보드가 처리)
    // 실패 시에만 예전 방식(직접 텔레그램 전송)으로 안전하게 대체한다.
    try {
      await sendToDashboard(formData);
    } catch (dashboardErr) {
      console.error('Dashboard intake error, falling back to direct Telegram send:', dashboardErr);
      await sendTelegramDirect(formData);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
