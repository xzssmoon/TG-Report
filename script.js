// ============================================================
// FORMSPREE — твой endpoint уже вставлен
// ============================================================
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgaedakv';

// ============================================================
// Отправка одной жалобы
// ============================================================
async function sendReport(target, reason, comment) {
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

    const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    return response.ok;
}

// ============================================================
// Основной процесс — отправка N жалоб
// ============================================================
async function processReports(target, reason, comment, count) {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
        try {
            const ok = await sendReport(target, reason, comment);
            if (ok) sent++;
            else failed++;
        } catch (e) {
            failed++;
        }

        const progress = Math.round(((i + 1) / count) * 100);
        window.showStatus('loading', `Отправлено ${i + 1}/${count} (${progress}%)`);

        // Пауза 400мс между жалобами
        await new Promise(r => setTimeout(r, 400));
    }

    return { sent, failed };
}

// ============================================================
// Инициализация UI и обработка кнопки
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const countSlider = document.getElementById('count');
    const countValue = document.getElementById('countValue');
    const statusDiv = document.getElementById('status');

    // Слайдер количества
    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            countValue.textContent = countSlider.value;
        });
    }

    // Функция показа статуса (выносим в window, чтобы processReports видел)
    window.showStatus = function(type, message) {
        if (!statusDiv) return;
        statusDiv.className = 'status ' + type;
        statusDiv.textContent = message;
    };

    // Валидация цели
    function validateTarget(target) {
        if (!target) return false;
        const phoneRegex = /^\+?[0-9]{7,15}$/;
        const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
        return phoneRegex.test(target) || usernameRegex.test(target);
    }

    // Клик по кнопке
    submitBtn.addEventListener('click', async () => {
        const target = document.getElementById('target').value.trim();
        const reason = document.getElementById('reason').value;
        const comment = document.getElementById('comment').value.trim();
        const count = parseInt(countSlider.value);

        if (!validateTarget(target)) {
            window.showStatus('error', '❌ Введите корректный номер или @username');
            return;
        }

        if (!FORMSPREE_ENDPOINT || FORMSPREE_ENDPOINT.includes('xxxx')) {
            window.showStatus('error', '❌ Formspree не настроен');
            return;
        }

        submitBtn.disabled = true;
        window.showStatus('loading', '⏳ Отправка жалоб...');

        try {
            const result = await processReports(target, reason, comment, count);

            if (result.sent > 0) {
                window.showStatus('success',
                    `✅ Отправлено ${result.sent} из ${count} жалоб!\n` +
                    `Неудачно: ${result.failed}\n` +
                    `Цель: ${target}`
                );
            } else {
                window.showStatus('error', '❌ Не удалось отправить. Проверь Formspree.');
            }
        } catch (error) {
            window.showStatus('error', '❌ Ошибка: ' + error.message);
        } finally {
            submitBtn.disabled = false;
        }
    });
});
