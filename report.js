// ============================================================
// КОНФИГУРАЦИЯ — вставь свои ключи
// ============================================================
const CONFIG = {
    // Formspree — принимает жалобы и шлёт тебе на почту
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/xxxxxxxx',

    // Firebase — база данных жалоб
    FIREBASE_URL: 'https://your-project.firebaseio.com/reports.json',

    // Telegram Bot — уведомления о новых жалобах
    BOT_TOKEN: '123456:ABC-DEF...',
    BOT_CHAT_ID: '123456789',

    // Стоп-листы ботов (публичные API)
    SPAMWATCH_API: 'https://api.spamwat.ch/v1/banlist',
    COMBOT_API: 'https://api.combot.org/v1/banlist'
};

// ============================================================
// Отправка жалобы в Telegram Support
// ============================================================
async function sendToTelegramSupport(target, reason, comment) {
    const reasonMap = {
        spam: 'Spam / advertising',
        scam: 'Fraud / scam',
        violence: 'Violence / threats',
        child: 'Child abuse',
        terror: 'Terrorism',
        drugs: 'Drugs',
        copyright: 'Copyright infringement',
        other: 'Other'
    };

    const payload = {
        target: target,
        reason: reasonMap[reason] || reason,
        comment: comment || 'No comment',
        timestamp: new Date().toISOString(),
        source: 'TG Report Web'
    };

    try {
        // Formspree — пересылает на почту, откуда уходит жалоба
        const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        console.error('Support send error:', error);
        return false;
    }
}

// ============================================================
// Добавление в стоп-листы ботов
// ============================================================
async function reportToSpamWatch(target) {
    try {
        const response = await fetch(CONFIG.SPAMWATCH_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: target,
                reason: 'Mass report from web',
                reporter: 'TG Report'
            })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// ============================================================
// Логирование в Firebase
// ============================================================
async function logToFirebase(data) {
    try {
        await fetch(CONFIG.FIREBASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================================
// Уведомление в Telegram-бота
// ============================================================
async function notifyBot(target, reason, count) {
    try {
        const text = `🚨 Новая жалоба\n\n` +
                     `Цель: ${target}\n` +
                     `Причина: ${reason}\n` +
                     `Количество: ${count}\n` +
                     `Время: ${new Date().toLocaleString()}`;

        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CONFIG.BOT_CHAT_ID,
                text: text
            })
        });
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================================
// Основной процесс отправки
// ============================================================
async function processReports(target, reason, comment, count) {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
        // 1. Жалоба в поддержку
        const supportOk = await sendToTelegramSupport(target, reason, comment);
        if (supportOk) sent++;
        else failed++;

        // 2. Добавление в стоп-листы (каждые 5 жалоб)
        if (i % 5 === 0) {
            await reportToSpamWatch(target);
        }

        // 3. Обновляем прогресс
        const progress = Math.round(((i + 1) / count) * 100);
        showStatus('loading', `Отправлено ${i + 1}/${count} (${progress}%)`);

        // 4. Задержка между отправками
        await new Promise(r => setTimeout(r, 300));
    }

    // Логируем всё
    await logToFirebase({
        target, reason, comment, count,
        sent, failed,
        timestamp: new Date().toISOString()
    });

    // Уведомляем бота
    await notifyBot(target, reason, count);

    return { sent, failed };
}

// ============================================================
// Обработчик кнопки
// ============================================================
submitBtn.addEventListener('click', async () => {
    const target = document.getElementById('target').value.trim();
    const reason = document.getElementById('reason').value;
    const comment = document.getElementById('comment').value.trim();
    const count = parseInt(countSlider.value);

    if (!validateTarget(target)) {
        showStatus('error', '❌ Введите корректный номер или @username');
        return;
    }

    submitBtn.disabled = true;
    showStatus('loading', '⏳ Отправка жалоб...');

    try {
        const result = await processReports(target, reason, comment, count);

        if (result.sent > 0) {
            showStatus('success',
                `✅ Отправлено ${result.sent} из ${count} жалоб!\n` +
                `Неудачно: ${result.failed}\n` +
                `Цель: ${target}\n` +
                `Чем больше жалоб — тем выше приоритет модерации.`
            );
        } else {
            showStatus('error', '❌ Не удалось отправить жалобы. Проверь настройки.');
        }
    } catch (error) {
        showStatus('error', '❌ Ошибка: ' + error.message);
    } finally {
        submitBtn.disabled = false;
    }
});
