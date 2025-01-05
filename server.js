const express = require('express');
const { getResponse } = require('./responses');
const bodyParser = require('body-parser');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const app = express();
const port = 3000;

// إعداد WhatsApp Web Client مع Puppeteer
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,  // تشغيل المتصفح بشكل مرئي (عدم الخفاء)
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isConnected = false; // تتبع حالة الاتصال

// أحداث WhatsApp Web Client
client.on('qr', (qr) => {
    console.log('Scan this QR code:');
    console.log(qr);
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true;
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    isConnected = false;
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    isConnected = false;
    // محاولة إعادة الاتصال تلقائيًا بعد فترة قصيرة
    reconnect();
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    client.initialize().catch((err) => {
        console.error('Failed to reinitialize client:', err);
    });
});

// استيراد الردود من الملف الخارجي
// الرد التلقائي على الرسائل
client.on('message', async (message) => {
    const response = getResponse(message.body); // الحصول على الرد المناسب
    if (response) {
        if (response.type === 'sticker') {
            // إرسال الملصق
            const media = MessageMedia.fromFilePath(response.path);
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
            console.log(`تم إرسال الملصق: ${response.path}`);
        } else {
            // الرد بالنصوص
            await message.reply(response);
            console.log(`رد تلقائي: ${message.body} => ${response}`);
        }
    }
});

// دالة لإعادة الاتصال في حال فصل الاتصال
function reconnect() {
    console.log('Reconnecting to WhatsApp...');
    setTimeout(() => {
        client.initialize().catch(err => {
            console.error('Error reconnecting:', err);
            reconnect(); // حاول إعادة الاتصال مرة أخرى بعد فشل
        });
    }, 5000); // إعادة الاتصال بعد 5 ثوانٍ من فصل الاتصال
}

// فحص الاتصال بشكل دوري
setInterval(() => {
    if (!isConnected) {
        console.log('Connection lost, attempting to reconnect...');
        reconnect();
    }
}, 60000); // فحص كل دقيقة

client.initialize();

// إعداد الخادم
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// نقاط النهاية
app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

app.get('/get-chats', (req, res) => {
    if (!isConnected) {
        return res.status(500).json({ error: 'WhatsApp غير متصل حاليًا' });
    }
    client.getChats().then((chats) => {
        const allChats = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name || 'بدون اسم'
        }));
        res.json(allChats);
    }).catch((err) => {
        console.error('Error fetching chats:', err);
        res.status(500).json({ error: 'فشل في تحميل الدردشات' });
        // حاول إعادة الاتصال بعد حدوث خطأ
        reconnect();
    });
});

app.post('/send-message', (req, res) => {
    const chatId = req.body.chat;
    const message = req.body.message;

    if (!isConnected) {
        return res.status(500).json({ error: 'WhatsApp غير متصل حاليًا' });
    }
    if (!chatId || !message) {
        return res.status(400).json({ error: 'المحادثة أو الرسالة مفقودة' });
    }
    client.sendMessage(chatId, message)
        .then(() => res.json({ success: true }))
        .catch((err) => {
            console.error('Failed to send message:', err);
            res.status(500).json({ success: false, error: err.message });
        });
});

// إضافة نقطة النهاية لإعادة الاتصال
app.post('/reconnect', (req, res) => {
    if (!client || !client.isReady) {
        // محاولة إعادة الاتصال
        console.log('Attempting to reconnect...');
        client.initialize().then(() => {
            res.json({ success: true });
        }).catch((error) => {
            console.error('Reconnect failed:', error);
            res.status(500).json({ success: false, error: 'فشل في إعادة الاتصال بـ WhatsApp Web' });
        });
    } else {
        res.json({ success: true });
    }
});

// تشغيل الخادم
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
