# HSM Simulator API

Esta API simula as funcionalidades básicas de um Hardware Security Module (HSM), oferecendo operações criptográficas seguras para arquivos.

## Funcionalidades

- Geração de par de chaves RSA
- Assinatura digital de arquivos com RSA
- Verificação de assinatura de arquivos com RSA
- Criptografia de arquivos com RSA/AES híbrido
- Descriptografia de arquivos com RSA/AES híbrido

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```
3. Inicie o servidor:
```bash
npm start
```

Para desenvolvimento, você pode usar:
```bash
npm run dev
```

## Endpoints

### 1. Gerar Par de Chaves RSA
```http
POST /generateKeyPair
```
Resposta:
```json
{
    "status": "success",
    "keyId": "uuid-da-chave",
    "publicKey": "chave-publica-pem"
}
```

### 2. Assinar Arquivo com RSA
```http
POST /sign
Content-Type: multipart/form-data
```
Parâmetros:
- `file`: Arquivo a ser assinado
- `keyId`: ID da chave RSA

Resposta:
```json
{
    "status": "success",
    "originalFile": "nome-do-arquivo",
    "signatureFile": "nome-do-arquivo.sig"
}
```

### 3. Verificar Assinatura de Arquivo
```http
POST /verify
Content-Type: multipart/form-data
```
Parâmetros:
- `file`: Arquivo original
- `signature`: Arquivo de assinatura (.sig)
- `keyId`: ID da chave RSA

Resposta:
```json
{
    "status": "success",
    "isValid": true/false
}
```

### 4. Criptografar Arquivo (RSA/AES Híbrido)
```http
POST /encrypt/rsa
Content-Type: multipart/form-data
```
Parâmetros:
- `file`: Arquivo a ser criptografado
- `keyId`: ID da chave RSA

Resposta:
```json
{
    "status": "success",
    "encryptedFile": "nome-do-arquivo.enc",
    "keyFile": "nome-do-arquivo.key"
}
```

### 5. Descriptografar Arquivo (RSA/AES Híbrido)
```http
POST /decrypt/rsa
Content-Type: multipart/form-data
```
Parâmetros:
- `file`: Arquivo criptografado (.enc)
- `keyFile`: Arquivo da chave (.key)
- `keyId`: ID da chave RSA

Resposta:
```json
{
    "status": "success",
    "decryptedFile": "nome-do-arquivo-original"
}
```

## Características de Segurança

- Utiliza RSA 2048 bits para operações assimétricas
- Sistema híbrido RSA/AES para criptografia de arquivos
  - AES-256-CBC para criptografia do arquivo
  - RSA para criptografia da chave AES
- Armazenamento seguro de chaves em memória
- Geração segura de IVs aleatórios para AES
- Padding OAEP para operações RSA
- Hash SHA-256 para assinaturas digitais

## Estrutura de Diretórios

- `/uploads`: Diretório temporário para upload de arquivos
- `/encrypted`: Arquivos criptografados e suas chaves
- `/decrypted`: Arquivos descriptografados
- `/signed`: Arquivos assinados e suas assinaturas

## Observações de Segurança

Este é um simulador para fins educacionais. Em um ambiente de produção, um HSM real oferece:

- Armazenamento físico seguro de chaves
- Proteção contra adulteração física
- Certificações de segurança (FIPS 140-2, Common Criteria)
- Backup seguro de chaves
- Controle de acesso robusto
- Auditoria detalhada

## Exemplo de Uso com cURL

1. Gerar par de chaves:
```bash
curl -X POST http://localhost:3000/generateKeyPair
```

2. Assinar um arquivo:
```bash
curl -X POST http://localhost:3000/sign \
  -F "file=@/caminho/do/arquivo" \
  -F "keyId=seu-key-id"
```

3. Verificar assinatura:
```bash
curl -X POST http://localhost:3000/verify \
  -F "file=@/caminho/do/arquivo" \
  -F "signature=@/caminho/do/arquivo.sig" \
  -F "keyId=seu-key-id"
```

4. Criptografar arquivo:
```bash
curl -X POST http://localhost:3000/encrypt/rsa \
  -F "file=@/caminho/do/arquivo" \
  -F "keyId=seu-key-id"
```

5. Descriptografar arquivo:
```bash
curl -X POST http://localhost:3000/decrypt/rsa \
  -F "file=@/caminho/do/arquivo.enc" \
  -F "keyFile=@/caminho/do/arquivo.key" \
  -F "keyId=seu-key-id"
``` 