// قائمة الردود
const responses = [
    { pattern: /كيف حالك؟/, response: 'الحمد لله، كيف حالك أنت؟' },
    { pattern: /مرحبا/, response: 'أهلاً وسهلاً!' },
    { pattern: /سلام\s?عليكم/, response: { type: 'sticker', path: './stickers/walikmsalam.webp' } },
    { pattern: /وداعاً/, response: 'إلى اللقاء!' }
];

// دالة للبحث عن الرد المناسب باستخدام التعبيرات النمطية
function getResponse(message) {
    // البحث في جميع الردود للتأكد من وجود تطابق مع التعبير النمطي
    for (let i = 0; i < responses.length; i++) {
        const { pattern, response } = responses[i];

        // إذا تطابق التعبير النمطي مع الرسالة
        if (pattern.test(message)) {
            return response;  // إرجاع الرد المناسب (سواء كان نصًا أو ملصقًا)
        }
    }

    return null;  // إذا لم يكن هناك تطابق مع أي رد
}

module.exports = { getResponse };
