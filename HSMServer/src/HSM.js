const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuração padrão
let config = {
    instanceId: 'default',
    keysDir: path.join(process.cwd(), 'instances', 'default', 'keys')
};

// Arquivos para armazenar as chaves
let KEYS_FILE;
let MASTER_KEY_FILE;

// Função para configurar o HSM
function configure(newConfig) {
    config = { ...config, ...newConfig };
    KEYS_FILE = path.join(config.keysDir, 'keystore.enc');
    MASTER_KEY_FILE = path.join(config.keysDir, '.master.key');
}

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
function generateKeyPair() {
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

    return {
        keyId,
        publicKey
    };
}

// Assina um arquivo com RSA
function signFile(fileBuffer, keyId) {
    const keyPair = keyStore.get(keyId);
    if (!keyPair) {
        throw new Error('Chave não encontrada');
    }

    const signer = crypto.createSign('SHA256');
    signer.update(fileBuffer);
    return signer.sign(keyPair.privateKey, 'base64');
}

// Verifica a assinatura de um arquivo
function verifySignature(fileBuffer, signature, keyId) {
    const keyPair = keyStore.get(keyId);
    if (!keyPair) {
        throw new Error('Chave não encontrada');
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(fileBuffer);
    return verifier.verify(keyPair.publicKey, signature, 'base64');
}

// Criptografa um arquivo com RSA
function encryptFileRSA(fileBuffer, keyId) {
    const keyPair = keyStore.get(keyId);
    if (!keyPair) {
        throw new Error('Chave não encontrada');
    }

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
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        Buffer.concat([aesKey, iv])
    );

    // Cria o arquivo final combinando a chave AES criptografada e o arquivo criptografado
    const keyLengthBuffer = Buffer.alloc(2);
    keyLengthBuffer.writeUInt16BE(encryptedAesKey.length);
    
    return Buffer.concat([
        keyLengthBuffer,           // 2 bytes para o tamanho da chave
        encryptedAesKey,           // Chave AES criptografada
        encryptedFile              // Arquivo criptografado
    ]);
}

// Descriptografa um arquivo com RSA
function decryptFileRSA(encryptedBuffer, keyId) {
    const keyPair = keyStore.get(keyId);
    if (!keyPair) {
        throw new Error('Chave não encontrada');
    }

    // Extrai a chave AES criptografada e o arquivo criptografado
    const keyLength = encryptedBuffer.readUInt16BE(0);
    
    if (keyLength === 0 || keyLength >= encryptedBuffer.length) {
        throw new Error('Tamanho da chave criptografada inválido');
    }
    
    const encryptedAesKey = encryptedBuffer.slice(2, keyLength + 2);
    
    if (encryptedAesKey.length !== keyLength) {
        throw new Error('Tamanho do buffer da chave AES não corresponde ao tamanho esperado');
    }
    
    const encryptedFile = encryptedBuffer.slice(keyLength + 2);

    // Descriptografa a chave AES
    const aesKeyWithIv = crypto.privateDecrypt(
        {
            key: keyPair.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        encryptedAesKey
    );

    // Separa a chave AES e o IV
    const aesKey = aesKeyWithIv.slice(0, 32);
    const iv = aesKeyWithIv.slice(32, 48);

    // Descriptografa o arquivo
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    let decryptedFile = decipher.update(encryptedFile);
    decryptedFile = Buffer.concat([decryptedFile, decipher.final()]);

    return decryptedFile;
}

// Obtém a chave pública de um ID de chave
function getPublicKey(keyId) {
    const keyPair = keyStore.get(keyId);
    if (!keyPair) {
        throw new Error('Chave não encontrada');
    }
    return keyPair.publicKey;
}

module.exports = {
    configure,
    generateKeyPair,
    signFile,
    verifySignature,
    encryptFileRSA,
    decryptFileRSA,
    getPublicKey
}; 