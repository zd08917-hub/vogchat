const nodemailer = require('nodemailer');

// Создаем транспортер (для разработки используем Ethereal)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Отправляет код подтверждения на email
 * @param {string} email - Адрес получателя
 * @param {string} code - Код подтверждения
 * @param {string} purpose - Цель (registration, login, password_reset)
 * @returns {Promise<Object>} Результат отправки
 */
async function sendVerificationCode(email, code, purpose) {
  let subject, text;
  
  switch (purpose) {
    case 'registration':
      subject = 'Код подтверждения для регистрации в Messenger';
      text = `Ваш код подтверждения: ${code}\nИспользуйте его для завершения регистрации. Код действителен 10 минут.`;
      break;
    case 'login':
      subject = 'Код для входа в Messenger';
      text = `Ваш код для входа: ${code}\nИспользуйте его для входа в аккаунт. Код действителен 10 минут.`;
      break;
    case 'password_reset':
      subject = 'Код для сброса пароля в Messenger';
      text = `Ваш код для сброса пароля: ${code}\nИспользуйте его для установки нового пароля. Код действителен 10 минут.`;
      break;
    default:
      subject = 'Код подтверждения';
      text = `Ваш код подтверждения: ${code}`;
  }

  // Для разработки: логируем код вместо отправки email
  console.log(`[DEV] Verification code for ${email} (${purpose}): ${code}`);
  console.log(`[DEV] Would send email with subject: "${subject}"`);
  
  // Возвращаем успешный результат без реальной отправки
  return { success: true, messageId: 'dev-' + Date.now() };
}

module.exports = { sendVerificationCode };