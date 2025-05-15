const express = require('express');
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

// Porta do servidor
const PORT = process.env.PORT || 3000;

// Sincroniza o banco de dados e inicia o servidor
sequelize.sync().then(() => {
    console.log('Banco de dados sincronizado');
    app.listen(PORT, () => {
      	console.log(`Servidor rodando na porta ${PORT}`);
    });
}).catch(error => {
    console.error('Erro ao sincronizar banco de dados:', error);
}); 