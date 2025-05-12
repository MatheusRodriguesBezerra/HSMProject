const express = require('express');
const app = express();

// Configurações básicas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota básica para teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor HSM funcionando!' });
});

// Porta do servidor
const PORT = process.env.PORT || 3000;

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 