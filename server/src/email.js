const nodemailer = require('nodemailer');

// Создаем транспортер
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Проверяем подключение к SMTP (только при запуске)
if (process.env.NODE_ENV !== 'test') {
  transporter.verify()
    .then(() => console.log('SMTP connection verified'))
    .catch(err => console.warn('SMTP connection failed:', err.message));
}

/**
 * Отправляет код подтверждения на email
 * @param {string} email - Адрес получателя
 * @param {string} code - Код подтверждения
 * @param {string} purpose - Цель (registration, login, password_reset)
 * @returns {Promise<Object>} Результат отправки
 */
async function sendVerificationCode(email, code, purpose) {
  let subject, text, html;
  
  switch (purpose) {
    case 'registration':
      subject = 'Код подтверждения для регистрации в Messenger';
      text = `Ваш код подтверждения: ${code}\nИспользуйте его для завершения регистрации. Код действителен 10 минут.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Добро пожаловать в Messenger!</h2>
          <p>Ваш код подтверждения для регистрации:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Используйте этот код для завершения регистрации. Код действителен 10 минут.</p>
          <p>Если вы не запрашивали регистрацию, проигнорируйте это письмо.</p>
        </div>
      `;
      break;
    case 'login':
      subject = 'Код для входа в Messenger';
      text = `Ваш код для входа: ${code}\nИспользуйте его для входа в аккаунт. Код действителен 10 минут.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Вход в Messenger</h2>
          <p>Ваш код для входа:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Используйте этот код для входа в аккаунт. Код действителен 10 минут.</p>
          <p>Если вы не запрашивали вход, проигнорируйте это письмо.</p>
        </div>
      `;
      break;
    case 'password_reset':
      subject = 'Код для сброса пароля в Messenger';
      text = `Ваш код для сброса пароля: ${code}\nИспользуйте его для установки нового пароля. Код действителен 10 минут.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Сброс пароля в Messenger</h2>
          <p>Ваш код для сброса пароля:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Используйте этот код для установки нового пароля. Код действителен 10 минут.</p>
          <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        </div>
      `;
      break;
    default:
      subject = 'Код подтверждения';
      text = `Ваш код подтверждения: ${code}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Ваш код подтверждения: <strong>${code}</strong></p>
        </div>
      `;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@messenger.example.com',
    to: email,
    subject: subject,
    text: text,
    html: html,
  };

  try {
    // В режиме разработки логируем вместо отправки, если не указаны SMTP креденшиалы
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_ethereal_user')) {
      console.log(`[DEV] Verification code for ${email} (${purpose}): ${code}`);
      console.log(`[DEV] Would send email with subject: "${subject}"`);
      return { success: true, messageId: 'dev-' + Date.now(), devMode: true };
    }

    // Реальная отправка
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} (${purpose}): ${info.messageId}`);
    return { success: true, messageId: info.messageId, devMode: false };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // В случае ошибки все равно логируем код для разработки
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV FALLBACK] Verification code for ${email} (${purpose}): ${code}`);
    }
    
    return { 
      success: false, 
      error: error.message,
      devMode: process.env.NODE_ENV === 'development'
    };
  }
}

module.exports = { sendVerificationCode };