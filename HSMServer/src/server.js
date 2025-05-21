const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const HSM = require('./HSM');
require('dotenv').config();

// Obtém o ID da instância e a porta dos argumentos da linha de comando
const args = process.argv.slice(2);
const INSTANCE_ID = args[2];

if(!INSTANCE_ID){
    console.error('Erro: É necessário fornecer o ID da instância');
    process.exit(1);
}

const PORT = parseInt(args[1]);
const HOST = '127.0.0.1';

// Valida se a porta é um número válido
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error('Erro: A porta deve ser um número entre 1 e 65535');
    process.exit(1);
}

// Configura os diretórios base para esta instância
const INSTANCE_DIR = path.join(process.cwd(), 'instances', args[2]);
const UPLOADS_DIR = path.join(INSTANCE_DIR, 'uploads');
const KEYS_DIR = path.join(INSTANCE_DIR, 'keys');

// Verifica e cria os diretórios necessários
[INSTANCE_DIR, UPLOADS_DIR, KEYS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Verifica permissões de escrita
    try {
        const testFile = path.join(dir, '.test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
    } catch (error) {
        console.error(`ERRO: Sem permissão de escrita em: ${dir}`);
        console.error('Detalhes do erro:', error);
        process.exit(1);
    }
});

// Configura o HSM com os diretórios específicos desta instância
HSM.configure({
    instanceId: INSTANCE_ID,
    keysDir: KEYS_DIR
});

const app = express();

// Middleware para verificar se a requisição vem do IP permitido
const MainServerOnly = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const allowedIp = process.env.ALLOWED_IP || '127.0.0.1';
    const isAllowed = clientIp === allowedIp || 
                     clientIp === '::1' || 
                     clientIp === `::ffff:${allowedIp}` ||
                     clientIp.includes(`::ffff:${allowedIp}`);

    if (!isAllowed) {
        return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. O HSM só aceita conexões do IP configurado.'
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
app.use(MainServerOnly);

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});
const upload = multer({ storage: storage });

// Gera um par de chaves RSA
app.post('/generateKeyPair', (req, res) => {
    try {
        const { keyId, publicKey } = HSM.generateKeyPair();
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

        // Lê o arquivo e calcula a assinatura
        const fileBuffer = fs.readFileSync(req.file.path);
        const signature = HSM.signFile(fileBuffer, keyId);

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

        if (!keyId || !req.files.file || !req.files.signature) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId, arquivo e arquivo de assinatura são obrigatórios'
            });
        }

        // Lê o arquivo e a assinatura
        const fileBuffer = fs.readFileSync(req.files.file[0].path);
        const signature = fs.readFileSync(req.files.signature[0].path, 'utf8');

        // Verifica a assinatura
        const isValid = HSM.verifySignature(fileBuffer, signature, keyId);

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

        // Lê o arquivo
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Criptografa o arquivo
        const finalBuffer = HSM.encryptFileRSA(fileBuffer, keyId);

        // Remove o arquivo temporário
        fs.unlinkSync(req.file.path);

        // Configura o cabeçalho para download do arquivo
        const parsedName = path.parse(req.file.originalname);
        const encryptedFileName = `encrypted.${parsedName.name}${parsedName.ext}`;
        
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
        if (!keyId || !req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'KeyId e arquivo criptografado são obrigatórios'
            });
        }

        // Lê o arquivo criptografado
        const encryptedBuffer = fs.readFileSync(req.file.path);

        // Descriptografa o arquivo
        const decryptedFile = HSM.decryptFileRSA(encryptedBuffer, keyId);

        // Remove o arquivo temporário
        fs.unlinkSync(req.file.path);

        // Configura o cabeçalho para download do arquivo
        const parsedName = path.parse(req.file.originalname);
        let decryptedFileName;
        
        // Remove o prefixo "encrypted." se existir
        if (parsedName.name.startsWith('encrypted.')) {
            decryptedFileName = parsedName.name.substring(10) + parsedName.ext;
        } else {
            decryptedFileName = parsedName.name + parsedName.ext;
        }
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${decryptedFileName}`);
        res.setHeader('Content-Length', decryptedFile.length);

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

// Obtém a chave pública de um ID de chave
app.get('/getPublicKey', (req, res) => {
    try {
        const { keyId } = req.query;

        if (!keyId) {
            return res.status(400).json({
                status: 'error',
                message: 'ID da chave é obrigatório'
            });
        }

        const publicKey = HSM.getPublicKey(keyId);

        res.json({
            status: 'success',
            keyId,
            publicKey
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Erro ao obter chave pública',
            error: error.message
        });
    }
});

// Endpoint para verificar se o servidor está funcionando
app.get('/ping', (req, res) => {
    console.log('Received ping');
    res.json({
        message: 'HSM Server is working',
        instanceId: INSTANCE_ID,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, HOST, () => {
    console.log(`HSM Simulator (Instância: ${INSTANCE_ID}) rodando em http://${HOST}:${PORT}`);
    console.log(`Diretório da instância: ${INSTANCE_DIR}`);
    console.log('AVISO: Este HSM só aceita conexões do localhost por questões de segurança');
}); 