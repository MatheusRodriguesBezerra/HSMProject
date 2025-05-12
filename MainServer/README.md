# MainServer - Projeto HSM

Este é o servidor principal do projeto HSM, responsável por gerenciar as operações do Hardware Security Module.

## Estrutura do Projeto

```
.
├── src/                    # Código fonte
│   ├── config/            # Configurações do projeto
│   ├── controllers/       # Controladores da aplicação
│   ├── middleware/        # Middlewares
│   ├── models/           # Modelos de dados
│   ├── routes/           # Rotas da API
│   ├── services/         # Serviços da aplicação
│   └── index.js          # Ponto de entrada da aplicação
├── tests/                # Testes automatizados
├── .gitignore           # Arquivos ignorados pelo git
├── package.json         # Dependências e scripts
└── README.md            # Este arquivo
```

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

## Scripts Disponíveis

- `npm start`: Inicia o servidor em modo produção
- `npm run dev`: Inicia o servidor em modo desenvolvimento com hot-reload
- `npm test`: Executa os testes automatizados

## Tecnologias Utilizadas

- Node.js
- Express.js
- Jest (testes)
- Outras dependências serão adicionadas conforme necessário 