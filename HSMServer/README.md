# HSM Simulator API

Esta API simula as funcionalidades avançadas de um Hardware Security Module (HSM), oferecendo um ambiente seguro para operações criptográficas e gerenciamento de chaves. O simulador foi projetado para fins educacionais e de desenvolvimento, implementando as principais funcionalidades encontradas em HSMs comerciais.

## Visão Geral

O HSM Simulator é uma aplicação Node.js que fornece uma API RESTful para:
- Gerenciamento completo do ciclo de vida de chaves criptográficas
- Operações criptográficas seguras
- Simulação de proteção física e lógica de chaves
- Interface para operações em lote
- Logging e auditoria de operações

## Funcionalidades Principais

### Gerenciamento de Chaves
- Geração de par de chaves RSA (2048/4096 bits)
- Importação e exportação segura de chaves
- Backup e restauração de chaves
- Rotação automática de chaves
- Destruição segura de material criptográfico

### Operações Criptográficas
- Assinatura digital RSA com PSS
- Verificação de assinaturas
- Criptografia híbrida RSA/AES
- Descriptografia de dados
- Geração de hash (SHA-256/SHA-512)
- Geração de números aleatórios seguros

## Arquitetura do Sistema

```
HSMServer/
├── src/                    # Código fonte
│   ├── config/            # Configurações do sistema
│   ├── controllers/       # Controladores da API
│   ├── crypto/           # Implementações criptográficas
│   ├── middleware/        # Middlewares Express
│   ├── models/           # Modelos de dados
│   ├── routes/           # Rotas da API
│   ├── utils/            # Utilitários
│   └── server.js         # Entrada da aplicação
├── instances/            # Instâncias de HSM virtuais
├── tests/                # Testes automatizados
└── docs/                 # Documentação adicional
```

## Requisitos do Sistema

- Node.js 14.x ou superior
- Sistema operacional: Linux, Windows ou macOS
- Mínimo de 2GB de RAM
- 1GB de espaço em disco

## Instalação

1. Clone o repositório:
```bash
git clone https://seu-repositorio/hsm-simulator.git
cd hsm-simulator
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o ambiente:
```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente no arquivo `.env`:
```env
ALLOWED_IP=<ip_permitido>
```

## Endpoints da API

### Gerenciamento de Chaves

#### Geração de Par de Chaves RSA
```http
POST /api/v1/keys/generate
Content-Type: application/json

{
    "algorithm": "RSA",
    "keySize": 2048,
    "label": "minha-chave",
    "attributes": {
        "extractable": false,
        "sensitive": true
    }
}
```

#### Importação de Chave
```http
POST /api/v1/keys/import
Content-Type: application/json

{
    "keyMaterial": "base64-encoded-key",
    "format": "pkcs8",
    "label": "chave-importada"
}
```

### Operações Criptográficas

#### Assinatura Digital
```http
POST /api/v1/crypto/sign
Content-Type: multipart/form-data

Parameters:
- file: <arquivo>
- keyId: <uuid>
- algorithm: "RSA-PSS-SHA256"
```

#### Criptografia de Dados
```http
POST /api/v1/crypto/encrypt
Content-Type: multipart/form-data

Parameters:
- file: <arquivo>
- keyId: <uuid>
- mode: "hybrid"
```

## Características de Segurança

### Proteção de Chaves
- Armazenamento seguro em memória protegida
- Criptografia em repouso (at-rest encryption)
- Controle de acesso baseado em roles (RBAC)
- Proteção contra extração não autorizada

### Medidas de Segurança
- Rate limiting por IP e por sessão
- Proteção contra ataques de timing
- Sanitização de memória após operações
- Validação rigorosa de entrada
- Auditoria detalhada de operações

## Monitoramento e Logs

### Logs de Sistema
- Logs de operações em formato estruturado
- Rotação automática de logs
- Níveis configuráveis de logging
- Integração com sistemas externos (opcional)

### Auditoria
- Registro detalhado de todas as operações
- Timestamps precisos
- Identificação de usuário/processo
- Hash encadeado de eventos

## Dependências Principais

- express: ^4.18.2 - Framework web
- crypto: ^1.0.1 - Operações criptográficas
- dotenv: ^16.3.1 - Configuração de ambiente
- cors: ^2.8.5 - Suporte a CORS
- uuid: ^9.0.1 - Geração de identificadores únicos
- multer: ^1.4.5-lts.1 - Upload de arquivos

## Desenvolvimento

### Scripts Disponíveis
- `npm start` - Inicia o servidor em modo produção
- `npm run dev` - Inicia com hot-reload para desenvolvimento

### Boas Práticas
- Siga o guia de estilo do projeto
- Documente novas funcionalidades
- Adicione testes para novos recursos
- Mantenha o logging consistente

## Limitações do Simulador

Este simulador é para fins educacionais e de desenvolvimento. Em um HSM real você encontraria:
- Proteção física contra adulteração
- Circuitos de detecção de intrusão
- Certificações FIPS 140-2 e Common Criteria
- Hardware dedicado para operações criptográficas
- Maior throughput de operações

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Suporte

Para suporte e dúvidas, abra uma issue no repositório ou contate a equipe de desenvolvimento. 