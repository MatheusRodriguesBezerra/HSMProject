const { sendMail } = require('../config/mail');

class EmailService {
    async sendPasswordResetLink(user, code) {
        const resetLink = `http://localhost:3000/user/set-password/${code}`;
        const subject = 'Redefinição de Senha';
        const text = `Olá ${user.name}, clique no link abaixo para definir uma nova senha: ${resetLink}`;
        const html = `
            <p>Olá ${user.name},</p>
            <p>Clique no link abaixo para definir uma nova senha:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Se você não solicitou esta redefinição, ignore este email.</p>
        `;

        return await sendMail(
            user.email,
            subject,
            text,
            html
        );
    }
}

module.exports = new EmailService(); 