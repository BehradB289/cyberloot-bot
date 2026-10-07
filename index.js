const { Bot } = require('grammy');
const { Pool } = require('pg');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);
const ADMIN_ID = BigInt(process.env.ADMIN_ID || 0);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getOrCreateUser(userId, username) {
  const role = (BigInt(userId) === ADMIN_ID) ? 'god' : 'player';
  const query = `
    INSERT INTO users (id, username, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE 
    SET username = EXCLUDED.username
    RETURNING *;
  `;
  const res = await pool.query(query, [userId, username, role]);
  return res.rows[0];
}

bot.command('start', async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx.from.id, ctx.from.username || ctx.from.first_name);
    let msg = `🎮 **به سایبرلوت خوش آمدید!**\n\n`;
    msg += `👤 کاربر: **${user.username}**\n`;
    msg += `💰 موجودی: **${user.balance} نانو**\n`;
    msg += `🎖 رنک شما: **${user.role.toUpperCase()}**\n\n`;

    if (user.role === 'god') {
      msg += `⚡️ دسترسی خالق هستی فعال است.\nبرای تست آپلود آیتم، یک عکس بفرستید.`;
    } else {
      msg += `منتظر شروع معاملات باشید!`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(err);
    await ctx.reply('⚠️ خطایی رخ داد، لطفاً مجدداً امتحان کنید.');
  }
});

// فوروارد خودکار عکس‌های ارسال‌شده به کانال ذخیره‌سازی
bot.on('message:photo', async (ctx) => {
  if (BigInt(ctx.from.id) !== ADMIN_ID) return;
  const photo = ctx.message.photo.pop();
  const fileId = photo.file_id;

  if (process.env.STORAGE_CHANNEL_ID) {
    await ctx.api.sendPhoto(process.env.STORAGE_CHANNEL_ID, fileId, {
      caption: `🎨 آیتم آپلود شده توسط God | File ID: \`${fileId}\``,
      parse_mode: 'Markdown'
    });
  }

  await ctx.reply(`✅ تصویر با موفقیت در CDN خصوصی تلگرام ذخیره شد!\nشناسه فایل:\n\`${fileId}\``, { parse_mode: 'Markdown' });
});

bot.start();
console.log('Bot engine started...');
