# MainServer - Projeto HSM

Este é o servidor principal do projeto HSM (Hardware Security Module), responsável por gerenciar todas as operações relacionadas à segurança e criptografia do hardware. O servidor fornece uma API RESTful para interação com o HSM, garantindo operações seguras e auditáveis.

## Características Principais

- Autenticação e autorização segura
- Gerenciamento de chaves criptográficas
- Operações criptográficas via HSM
- Logging e auditoria de operações
- Integração com banco de dados PostgreSQL
- Sistema de notificações por email

## Estrutura do Projeto

```
.
├── src/                    # Código fonte
│   ├── config/            # Configurações do projeto (ambiente, banco de dados, etc.)
│   ├── controllers/       # Controladores da aplicação (lógica de negócios)
│   ├── database/         # Configurações e modelos do banco de dados
│   ├── middleware/        # Middlewares (autenticação, validação, etc.)
│   ├── routes/           # Rotas da API
│   ├── services/         # Serviços da aplicação (lógica complexa isolada)
│   └── index.js          # Ponto de entrada da aplicação
├── ssl/                  # Certificados SSL para HTTPS
├── tests/                # Testes automatizados
├── .gitignore           # Arquivos ignorados pelo git
├── package.json         # Dependências e scripts
└── README.md            # Documentação do projeto
```

## Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL (v12 ou superior)
- Hardware Security Module configurado
- Certificados SSL válidos

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Copie o conteúdo de `.env.example` e ajuste as variáveis

## Configuração do Ambiente

O projeto requer as seguintes variáveis de ambiente:

```env
DB_HOST=localhost
DB_USER=seu_usuario_db
DB_PASS=sua_senha_db
DB_NAME=nome_do_banco
DB_PORT=5432
DB_SSL=false
PORT=3000
MAIL_HOST=smtp.provedor.com
MAIL_PORT=587
MAIL_SECURE=true
MAIL_USER=seu_email@provedor.com
MAIL_PASS=sua_senha_email
JWT_SECRET=seu_jwt_secret
GOOGLE_ACCESS_TOKEN=seu_google_token

HSMServersLength=numero_de_hsm
HSMInstance1=hsm1
HSMIp1=locahost
HSMPort1=8080
HSMInstance2=hsm2 
HSMIp2=locahost
HSMPort2=8081
HSMInstance3=hsm3
HSMIp3=locahost
HSMPort3=8082
```

## Scripts Disponíveis

- `npm start`: Inicia o servidor em modo produção
- `npm run dev`: Inicia o servidor em modo desenvolvimento com hot-reload
- `npm test`: Executa os testes automatizados
- `npm run test-db-connection`: Testa a conexão com o banco de dados

## Tecnologias Utilizadas

### Principais
- Node.js - Ambiente de execução
- Express.js - Framework web
- Sequelize - ORM para PostgreSQL
- JSON Web Token - Autenticação
- BCrypt - Hashing de senhas

### Dependências
- axios: ^1.9.0 - Cliente HTTP
- bcryptjs: ^3.0.2 - Criptografia de senhas
- dotenv: ^16.5.0 - Variáveis de ambiente
- express: ^5.1.0 - Framework web
- jsonwebtoken: ^9.0.2 - Autenticação JWT
- multer: ^2.0.0 - Upload de arquivos
- nodemailer: ^7.0.3 - Envio de emails
- pg: ^8.16.0 - Cliente PostgreSQL
- sequelize: ^6.37.7 - ORM

### Desenvolvimento
- jest: ^29.7.0 - Framework de testes
- nodemon: ^3.1.10 - Hot-reload para desenvolvimento

## Segurança

- Todas as comunicações são realizadas via HTTPS
- Autenticação baseada em JWT
- Senhas armazenadas com hash bcrypt
- Validação de entrada em todas as rotas
- Rate limiting para prevenção de ataques
- Logs de auditoria para todas as operações críticas

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Crie um Pull Request

## Licença

ISC 