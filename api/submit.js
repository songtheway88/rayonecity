// api/submit.js

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { name, phone, type, residence, visit_date, message, source } = req.body;

    // Vercel 환경변수에서 텔레그램 토큰과 챗 ID를 가져옵니다.
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables.');
      return res.status(500).json({ error: '서버의 텔레그램 환경변수(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) 설정이 누락되었습니다.' });
    }

    // 알림 메시지 포맷 구성
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

    // 텔레그램 봇 API 호출 (다중 수신 지원)
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const chatIds = chatId.split(',').map(id => id.trim()).filter(Boolean);

    const sendPromises = chatIds.map(async (id) => {
      try {
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: id,
            text: text,
          }),
        });
        
        const result = await response.json();
        if (!result.ok) {
          console.error(`Telegram API Error for chatId ${id}:`, result);
        }
      } catch (err) {
        console.error(`Fetch error for chatId ${id}:`, err);
      }
    });

    await Promise.all(sendPromises);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
