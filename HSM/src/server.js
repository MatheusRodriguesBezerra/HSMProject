const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware para verificar se a requisição vem do localhost
const localhostOnly = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const isLocalhost = clientIp === '127.0.0.1' || 
                       clientIp === '::1' || 
                       clientIp === '::ffff:127.0.0.1' ||
                       clientIp.includes('::ffff:127.0.0.1');

    if (!isLocalhost) {
        return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. O HSM só aceita conexões do localhost.'
        });
    }
    next();
};

// Configuração do CORS para aceitar apenas localhost
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(localhostOnly);

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});
const upload = multer({ storage: storage });

// Criar diretórios necessários
['uploads', 'encrypted', 'decrypted', 'signed', 'keys'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Arquivo para armazenar as chaves
const KEYS_FILE = path.join('keys', 'keystore.enc');
const MASTER_KEY_FILE = path.join('keys', '.master.key');

// Gera ou carrega a chave mestra
function getMasterKey() {
    try {
        if (fs.existsSync(MASTER_KEY_FILE)) {
            return fs.readFileSync(MASTER_KEY_FILE);
        } else {
            const masterKey = crypto.randomBytes(32);
            fs.writeFileSync(MASTER_KEY_FILE, masterKey);
            return masterKey;
        }
    } catch (error) {
        console.error('Erro ao gerenciar chave mestra:', error);
        throw error;
    }
}

// Função para criptografar dados
function encryptData(data) {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

// Função para descriptografar dados
function decryptData(encryptedData) {
    const masterKey = getMasterKey();
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        masterKey,
        Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Função para carregar chaves do arquivo
function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            const encryptedData = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
            const decryptedData = decryptData(encryptedData);
            return new Map(Object.entries(JSON.parse(decryptedData)));
        }
    } catch (error) {
        console.error('Erro ao carregar chaves:', error);
    }
    return new Map();
}

// Função para salvar chaves no arquivo
function saveKeys(keyStore) {
    try {
        const data = JSON.stringify(Object.fromEntries(keyStore));
        const encryptedData = encryptData(data);
        fs.writeFileSync(KEYS_FILE, JSON.stringify(encryptedData), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar chaves:', error);
    }
}

// Simula o armazenamento seguro de chaves do HSM
const keyStore = loadKeys();

// Função para adicionar uma nova chave
function addKey(keyId, keyData) {
    keyStore.set(keyId, keyData);
    saveKeys(keyStore);
}

// Gera um par de chaves RSA
app.post('/generateKeyPair', (req, res) => {
    try {
        const keyId = uuidv4();
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        addKey(keyId, { publicKey, privateKey });

        res.json({
            status: 'success',
            keyId,
            publicKey
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Erro ao gerar par de chaves',
            error: error.message
        });
    }
});

// Assina um arquivo com RSA
app.post('/sign', upload.single('file'), (req, res) => {
    try {
        const { keyId } = req.body;
        
        if (!keyId || !req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId e arquivo são obrigatórios'
            });
        }

        const keyPair = keyStore.get(keyId);
        if (!keyPair) {
            return res.status(404).json({
                status: 'error',
                message: 'Chave não encontrada'
            });
        }

        // Lê o arquivo e calcula a assinatura
        const fileBuffer = fs.readFileSync(req.file.path);
        const signer = crypto.createSign('SHA256');
        signer.update(fileBuffer);
        const signature = signer.sign(keyPair.privateKey, 'base64');

        // Remove o arquivo temporário
        fs.unlinkSync(req.file.path);

        // Configura o cabeçalho para download do arquivo
        const signatureFileName = `${path.parse(req.file.originalname).name}.sig`;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${signatureFileName}`);
        res.setHeader('Content-Length', signature.length);

        // Envia a assinatura como arquivo
        res.send(signature);
    } catch (error) {
        // Garante que o arquivo temporário seja removido em caso de erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Erro ao assinar arquivo',
            error: error.message
        });
    }
});

// Verifica a assinatura de um arquivo
app.post('/verify', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), (req, res) => {
    try {
        const { keyId } = req.body;

        console.log(req.files);
        console.log(req.file);
        console.log(keyId);

        if (!keyId || !req.files.file || !req.files.signature) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId, arquivo e arquivo de assinatura são obrigatórios'
            });
        }

        const keyPair = keyStore.get(keyId);
        if (!keyPair) {
            return res.status(404).json({
                status: 'error',
                message: 'Chave não encontrada'
            });
        }

        // Lê o arquivo e a assinatura
        const fileBuffer = fs.readFileSync(req.files.file[0].path);
        const signature = fs.readFileSync(req.files.signature[0].path, 'utf8');

        // Verifica a assinatura
        const verifier = crypto.createVerify('SHA256');
        verifier.update(fileBuffer);
        const isValid = verifier.verify(keyPair.publicKey, signature, 'base64');

        // Remove os arquivos temporários
        fs.unlinkSync(req.files.file[0].path);
        fs.unlinkSync(req.files.signature[0].path);

        res.json({
            status: 'success',
            isValid: isValid,
            algorithm: 'SHA256withRSA'
        });
    } catch (error) {
        // Garante que os arquivos temporários sejam removidos em caso de erro
        if (req.files) {
            if (req.files.file && fs.existsSync(req.files.file[0].path)) {
                fs.unlinkSync(req.files.file[0].path);
            }
            if (req.files.signature && fs.existsSync(req.files.signature[0].path)) {
                fs.unlinkSync(req.files.signature[0].path);
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Erro ao verificar assinatura',
            error: error.message
        });
    }
});

// Criptografa um arquivo com RSA
app.post('/encrypt/rsa', upload.single('file'), (req, res) => {
    try {
        const { keyId } = req.body;
        if (!keyId || !req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId e arquivo são obrigatórios'
            });
        }

        const keyPair = keyStore.get(keyId);
        if (!keyPair) {
            return res.status(404).json({
                status: 'error',
                message: 'Chave não encontrada'
            });
        }

        // Lê o arquivo
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Gera uma chave AES aleatória para o arquivo
        const aesKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Criptografa o arquivo com AES
        const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
        let encryptedFile = cipher.update(fileBuffer);
        encryptedFile = Buffer.concat([encryptedFile, cipher.final()]);

        // Criptografa a chave AES com RSA
        const encryptedAesKey = crypto.publicEncrypt(
            {
                key: keyPair.publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.concat([aesKey, iv])
        );

        // Cria o arquivo final combinando a chave AES criptografada e o arquivo criptografado
        const finalBuffer = Buffer.concat([
            Buffer.from([encryptedAesKey.length]), // 1 byte para o tamanho da chave
            encryptedAesKey,                       // Chave AES criptografada
            encryptedFile                          // Arquivo criptografado
        ]);

        // Remove o arquivo temporário
        fs.unlinkSync(req.file.path);

        // Configura o cabeçalho para download do arquivo
        const encryptedFileName = `${path.parse(req.file.originalname).name}.enc`;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${encryptedFileName}`);
        res.setHeader('Content-Length', finalBuffer.length);

        // Envia o arquivo criptografado
        res.send(finalBuffer);
    } catch (error) {
        // Garante que o arquivo temporário seja removido em caso de erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Erro ao criptografar arquivo',
            error: error.message
        });
    }
});

// Descriptografa um arquivo com RSA
app.post('/decrypt/rsa', upload.single('file'), (req, res) => {
    try {
        const { keyId } = req.body;
        console.log(keyId);
        console.log(req.file);
        if (!keyId || !req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId e arquivo criptografado são obrigatórios'
            });
        }
        console.log(2)

        const keyPair = keyStore.get(keyId);
        if (!keyPair) {
            return res.status(404).json({
                status: 'error',
                message: 'Chave não encontrada'
            });
        }

        console.log(3)

        // Lê o arquivo criptografado
        const encryptedBuffer = fs.readFileSync(req.file.path);

        // Extrai a chave AES criptografada e o arquivo criptografado
        const keyLength = encryptedBuffer[0]; // Primeiro byte é o tamanho da chave
        const encryptedAesKey = encryptedBuffer.slice(1, keyLength + 1);
        const encryptedFile = encryptedBuffer.slice(keyLength + 1);

        console.log(4)

        // Descriptografa a chave AES
        const aesKeyWithIv = crypto.privateDecrypt(
            {
                key: keyPair.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            encryptedAesKey
        );

        console.log(5)

        // Separa a chave AES e o IV
        const aesKey = aesKeyWithIv.slice(0, 32);
        const iv = aesKeyWithIv.slice(32);

        console.log(6)

        // Descriptografa o arquivo
        const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
        let decryptedFile = decipher.update(encryptedFile);
        decryptedFile = Buffer.concat([decryptedFile, decipher.final()]);

        console.log(7)

        // Remove o arquivo temporário
        fs.unlinkSync(req.file.path);

        // Configura o cabeçalho para download do arquivo
        const decryptedFileName = path.parse(req.file.originalname).name.replace('.enc', '');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${decryptedFileName}`);
        res.setHeader('Content-Length', decryptedFile.length);

        console.log(8)

        // Envia o arquivo descriptografado
        res.send(decryptedFile);
    } catch (error) {
        // Garante que o arquivo temporário seja removido em caso de erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            status: 'error',
            message: 'Erro ao descriptografar arquivo',
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

app.listen(PORT, HOST, () => {
    console.log(`HSM Simulator rodando em http://${HOST}:${PORT}`);
    console.log('AVISO: Este HSM só aceita conexões do localhost por questões de segurança');
}); 