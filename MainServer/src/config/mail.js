require('dotenv').config();

const nodemailer = require('nodemailer');

// Configuração do transporter do Nodemailer
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.GOOGLE_ACCESS_TOKEN
    }
});

// Função para enviar email
async function sendMail(to, subject, text, html) {
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_USER, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            text: text, // plain text body
            html: html // html body
        });
        
        return info;
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        throw error;
    }
}

module.exports = {
    transporter,
    sendMail
}; 