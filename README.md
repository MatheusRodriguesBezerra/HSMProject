# Projeto HSM - Sistema de Gerenciamento de Hardware Security Module

Este projeto implementa uma solução completa de gerenciamento de HSM (Hardware Security Module), consistindo em dois servidores que trabalham em conjunto para fornecer operações criptográficas seguras e gerenciamento de chaves.

## Arquitetura do Sistema

O projeto é dividido em dois componentes principais:

### 1. MainServer
O servidor principal que atua como interface para os clientes e gerencia todas as operações de alto nível. Responsável por:
- Autenticação e autorização de usuários
- Interface REST API para clientes
- Gerenciamento de requisições
- Logging e auditoria
- Persistência de dados em PostgreSQL
- Notificações por email

### 2. HSMServer
Um simulador de HSM que implementa as operações criptográficas e de segurança. Oferece:
- Gerenciamento do ciclo de vida de chaves
- Operações criptográficas (assinatura, verificação, criptografia)
- Proteção e isolamento de chaves
- Interface REST API para comunicação com o MainServer

## Como Executar

### Pré-requisitos
- Node.js (versão 18 ou superior)
- PostgreSQL
- npm ou yarn

### Configuração e Execução

1. **HSMServer (Primeiro)**
```bash
cd HSMServer
npm install
npm run dev
```
O HSMServer estará disponível em `http://localhost:3001`

2. **MainServer (Segundo)**
```bash
cd MainServer
npm install
npm run dev
```
O MainServer estará disponível em `http://localhost:3000`

## Fluxo de Operação

1. Os clientes interagem exclusivamente com o MainServer através de sua API REST
2. O MainServer autentica e valida as requisições
3. Quando necessário, o MainServer encaminha operações criptográficas para o HSMServer
4. O HSMServer processa as operações de forma segura e retorna os resultados
5. O MainServer registra as operações e retorna as respostas aos clientes

## Documentação Detalhada

- [Documentação do MainServer](./MainServer/README.md)
- [Documentação do HSMServer](./HSMServer/README.md)

## Segurança

Este projeto implementa várias camadas de segurança:
- Autenticação via tokens JWT
- TLS/SSL para todas as comunicações
- Isolamento de chaves criptográficas
- Logging detalhado de todas as operações
- Validação de entrada em todas as APIs
- Proteção contra ataques comuns (rate limiting, sanitização de entrada)

## Desenvolvimento e Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes. 