const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();
const sequelize = require('./database');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const logRequest = require('./middleware/logMiddleware');

// Configurações básicas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logs
app.use(logRequest);

// Rotas
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Rota básica para teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor HSM funcionando!' });
});

// Configurações do servidor
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Opções para o servidor HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.pem'))
};

// Sincroniza o banco de dados e inicia os servidores
sequelize.sync().then(() => {
    console.log('Banco de dados sincronizado');
    
    // Inicia servidor HTTP
    app.listen(PORT, () => {
        console.log(`Servidor HTTP rodando na porta ${PORT}`);
    });
    
    // Inicia servidor HTTPS
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`Servidor HTTPS rodando na porta ${HTTPS_PORT}`);
    });
}).catch(error => {
    console.error('Erro ao sincronizar banco de dados:', error);
}); 