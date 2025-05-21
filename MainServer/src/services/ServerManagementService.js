const dotenv = require('dotenv');
const http = require('http');
const sequelize = require('../database');

dotenv.config();

class ServerManagementService {
    constructor() {
        this.servers = [];
        this.loadServers();
    }

    loadServers() {
        const serversLength = parseInt(process.env.HSMServersLength) || 0;
        
        for (let i = 1; i <= serversLength; i++) {
            const serverName = process.env[`HSMInstance${i}`];
            const serverIp = process.env[`HSMIp${i}`];
            const serverPort = parseInt(process.env[`HSMPort${i}`]);

            if (serverName && serverIp && serverPort) {
                this.servers.push({
                    name: serverName,
                    ip: serverIp,
                    port: serverPort
                });
            }
        }
    }

    async ping(serverName) {
        const server = this.servers.find(s => s.name === serverName);
        
        if (!server) {
            throw new Error(`Servidor ${serverName} não encontrado`);
        }

        return new Promise((resolve) => {
            const options = {
                hostname: server.ip,
                port: server.port,
                path: '/ping',
                method: 'GET',
                timeout: 1000 // 1 segundo de timeout
            };

            const req = http.request(options, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', (error) => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    getServers() {
        return this.servers;
    }

    async createKeyPair(userId) {
        const serversLength = parseInt(process.env.HSMServersLength);
        
        // Escolhe dois servidores aleatórios diferentes
        const serverIndexes = [];
        while (serverIndexes.length < 2) {
            const randomIndex = Math.floor(Math.random() * serversLength) + 1;
            if (!serverIndexes.includes(randomIndex)) {
                serverIndexes.push(randomIndex);
            }
        }

        const selectedServers = serverIndexes.map(index => ({
            name: process.env[`HSMInstance${index}`],
            ip: process.env[`HSMIp${index}`],
            port: parseInt(process.env[`HSMPort${index}`])
        }));

        const keyPairs = [];

        for (const server of selectedServers) {
            // Verifica se o servidor está online
            const isOnline = await this.ping(server.name);
            console.log(`Servidor ${server.name} está online: ${isOnline}`);
            
            if (isOnline) {
                try {
                    const keyId = await this.generateKeyPair(server);
                    keyPairs.push({
                        serverName: server.name,
                        keyId: keyId
                    });
                } catch (error) {
                    console.error(`Erro ao gerar par de chaves no servidor ${server.name}:`, error);
                }
            }
        }

        if (keyPairs.length === 2) {
            // Atualiza o usuário com as referências das chaves
            await sequelize.query(
                `UPDATE users 
                SET server_name_1 = :serverName1,
                    key_reference_1 = :keyId1,
                    server_name_2 = :serverName2,
                    key_reference_2 = :keyId2
                WHERE id = :userId`,
                {
                    replacements: {
                        serverName1: keyPairs[0].serverName,
                        keyId1: keyPairs[0].keyId,
                        serverName2: keyPairs[1].serverName,
                        keyId2: keyPairs[1].keyId,
                        userId: userId
                    },
                    type: sequelize.QueryTypes.UPDATE
                }
            );

            return {
                success: true,
                message: 'Par de chaves gerado com sucesso',
                keyPairs
            };
        }

        return {
            success: false,
            message: 'Não foi possível gerar o par de chaves em dois servidores diferentes'
        };
    }

    async generateKeyPair(server) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: server.ip,
                port: server.port,
                path: '/generateKeyPair',
                method: 'POST',
                timeout: 2000 // 2 segundos de timeout
            };


            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const response = JSON.parse(data);
                            resolve(response.keyId);
                        } catch (error) {
                            reject(new Error('Resposta inválida do servidor'));
                        }
                    } else {
                        reject(new Error(`Erro ao gerar par de chaves: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout ao gerar par de chaves'));
            });

            req.end();
        });
    }

    async signFile(userId, file) {
        try {
            // 1. Buscar informações do usuário
            const [user] = await sequelize.query(
                `SELECT server_name_1, key_reference_1, server_name_2, key_reference_2 
                FROM users WHERE id = :userId`,
                {
                    replacements: { userId },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // 2. Verificar e assinar com cada servidor
            const signatures = [];
            const servers = [
                { name: user.server_name_1, keyId: user.key_reference_1 },
                { name: user.server_name_2, keyId: user.key_reference_2 }
            ];

            for (const server of servers) {
                const serverInfo = this.servers.find(s => s.name === server.name);
                if (!serverInfo) {
                    throw new Error(`Servidor ${server.name} não encontrado`);
                }

                // Verificar se o servidor está online
                const isOnline = await this.ping(server.name);
                if (!isOnline) {
                    throw new Error(`Servidor ${server.name} está offline`);
                }
                
                // Enviar arquivo para assinatura
                const signature = await this.sendFileForSigning(serverInfo, file, server.keyId);
                signatures.push(signature);
            }

            // 3. Criar objetos de arquivo para cada assinatura
            const signatureFiles = {
                signature1: {
                    buffer: signatures[0],
                    originalname: `${file.originalname}.sig`,
                    mimetype: 'application/octet-stream'
                },
                signature2: {
                    buffer: signatures[1],
                    originalname: `${file.originalname}.sig`,
                    mimetype: 'application/octet-stream'
                }
            };

            return signatureFiles;

        } catch (error) {
            console.error('Erro ao assinar arquivo:', error);
            throw error;
        }
    }

    async sendFileForSigning(server, file, keyId) {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('Arquivo não fornecido'));
            }

            const FormData = require('form-data');
            const fs = require('fs');
            const form = new FormData();
            
            try {
                // Verifica se o arquivo tem buffer ou path
                if (!file.buffer && !file.path) {
                    throw new Error('Arquivo inválido: sem buffer ou path');
                }

                // Verifica se o arquivo existe no path
                if (file.path && !fs.existsSync(file.path)) {
                    throw new Error(`Arquivo não encontrado no path: ${file.path}`);
                }

                // Adiciona o arquivo ao form
                if (file.buffer) {
                    form.append('file', file.buffer, {
                        filename: file.originalname || 'arquivo',
                        contentType: file.mimetype || 'application/octet-stream'
                    });
                } else if (file.path) {
                    const fileStream = fs.createReadStream(file.path);
                    
                    fileStream.on('error', (error) => {
                        console.error('Erro ao ler o arquivo:', error);
                        reject(error);
                    });

                    form.append('file', fileStream, {
                        filename: file.originalname || 'arquivo',
                        contentType: file.mimetype || 'application/octet-stream'
                    });
                }
                
                // Adiciona o keyId ao form
                form.append('keyId', keyId);

                const options = {
                    hostname: server.ip,
                    port: server.port,
                    path: '/sign',
                    method: 'POST',
                    headers: form.getHeaders(),
                    timeout: 5000 // 5 segundos de timeout
                };

                const req = http.request(options, (res) => {
                    let data = [];

                    res.on('data', (chunk) => {
                        data.push(chunk);
                    });

                    res.on('end', () => {
                        const responseData = Buffer.concat(data);

                        if (res.statusCode === 200) {
                            resolve(responseData);
                        } else {
                            let errorMessage = `Erro ao assinar arquivo: ${res.statusCode}`;
                            try {
                                const errorData = JSON.parse(responseData.toString());
                                errorMessage += ` - ${errorData.message || ''}`;
                                console.error('Detalhes do erro:', errorData);
                            } catch (e) {
                                console.error('Resposta do servidor (texto):', responseData.toString());
                            }
                            reject(new Error(errorMessage));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error("Erro na requisição:", error);
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout ao assinar arquivo'));
                });

                // Envia o form
                form.pipe(req);
            } catch (error) {
                console.error('Erro ao preparar o formulário:', error);
                reject(error);
            }
        });
    }

    async verifySignature(userName, file, signatureFile) {
        try {
            // 1. Buscar informações do usuário pelo nome
            const [user] = await sequelize.query(
                `SELECT server_name_1, key_reference_1, server_name_2, key_reference_2 
                FROM users WHERE name = :userName`,
                {
                    replacements: { userName },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // 2. Verificar servidores online
            const servers = [
                { name: user.server_name_1, keyId: user.key_reference_1 },
                { name: user.server_name_2, keyId: user.key_reference_2 }
            ];

            const isServer1Online = await this.ping(servers[0].name);
            const isServer2Online = await this.ping(servers[1].name);

            if (!isServer1Online && !isServer2Online) {
                throw new Error('Nenhum servidor está online para verificação');
            }

            let onlineServer = null;

            if (isServer1Online) {
                onlineServer = servers[0];
            } else {
                onlineServer = servers[1];
            }

            // 3. Ler o arquivo de assinatura
            const fs = require('fs');
            let signatureBuffer;
            
            if (signatureFile.buffer) {
                signatureBuffer = signatureFile.buffer;
            } else if (signatureFile.path) {
                signatureBuffer = fs.readFileSync(signatureFile.path);
            } else {
                throw new Error('Arquivo de assinatura inválido');
            }

            // 4. Dividir a assinatura em duas partes
            const signatureLength = signatureBuffer.length / 2;
            const signature1 = signatureBuffer.slice(0, signatureLength);
            const signature2 = signatureBuffer.slice(signatureLength);

            const signature = isServer1Online ? signature1 : signature2;

            const server = this.servers.find(s => s.name === onlineServer.name);

            // 5. Enviar para verificação no servidor online
            const verificationResult = await this.sendFileForVerification(server, file, signature, onlineServer.keyId);

            return verificationResult;

        } catch (error) {
            console.error('Erro ao verificar assinatura:', error);
            throw error;
        }
    }

    async sendFileForVerification(server, file, signature, keyId) {
        return new Promise((resolve, reject) => {
            if (!file || !signature) {
                return reject(new Error('Arquivo ou assinatura não fornecidos'));
            }

            console.log('server', server);
            console.log('file', file);
            console.log('signature', signature);
            console.log('keyId', keyId);

            const FormData = require('form-data');
            const form = new FormData();
            
            try {
                // Adiciona o arquivo ao form
                form.append('file', file.buffer, {
                    filename: file.originalname || 'arquivo',
                    contentType: file.mimetype || 'application/octet-stream'
                });

                // Adiciona a assinatura ao form
                form.append('signature', signature, {
                    filename: 'signature.sig',
                    contentType: 'application/octet-stream'
                });
                
                // Adiciona o keyId ao form
                form.append('keyId', keyId);

                const options = {
                    hostname: server.ip,
                    port: server.port,
                    path: '/verify',
                    method: 'POST',
                    headers: form.getHeaders(),
                    timeout: 5000
                };

                const req = http.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            try {
                                const response = JSON.parse(data);
                                resolve(response);
                            } catch (error) {
                                reject(new Error('Resposta inválida do servidor'));
                            }
                        } else {
                            let errorMessage = `Erro ao verificar assinatura: ${res.statusCode}`;
                            try {
                                const errorData = JSON.parse(data);
                                errorMessage += ` - ${errorData.message || ''}`;
                            } catch (e) {
                                console.error('Resposta do servidor (texto):', data);
                            }
                            reject(new Error(errorMessage));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error("Erro na requisição:", error);
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout ao verificar assinatura'));
                });

                form.pipe(req);
            } catch (error) {
                console.error('Erro ao preparar o formulário:', error);
                reject(error);
            }
        });
    }

    async encryptFile(userName, file) {
        try {
            // 1. Buscar informações do usuário pelo nome
            const [user] = await sequelize.query(
                `SELECT server_name_1, key_reference_1, server_name_2, key_reference_2 
                FROM users WHERE name = :userName`,
                {
                    replacements: { userName },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // 2. Verificar e criptografar com cada servidor
            const encryptedFiles = [];
            const servers = [
                { name: user.server_name_1, keyId: user.key_reference_1 },
                { name: user.server_name_2, keyId: user.key_reference_2 }
            ];

            for (const server of servers) {
                const serverInfo = this.servers.find(s => s.name === server.name);
                if (!serverInfo) {
                    throw new Error(`Servidor ${server.name} não encontrado`);
                }

                // Verificar se o servidor está online
                const isOnline = await this.ping(server.name);
                if (!isOnline) {
                    throw new Error(`Servidor ${server.name} está offline`);
                }
                
                // Enviar arquivo para criptografia
                const encrypted = await this.sendFileForEncryption(serverInfo, file, server.keyId);
                encryptedFiles.push(encrypted);
            }

            // 3. Criar objetos de arquivo para cada criptografia
            const encryptedFileObjects = {
                encrypted1: {
                    buffer: encryptedFiles[0],
                    originalname: `${file.originalname}.enc`,
                    mimetype: 'application/octet-stream'
                },
                encrypted2: {
                    buffer: encryptedFiles[1],
                    originalname: `${file.originalname}.enc`,
                    mimetype: 'application/octet-stream'
                }
            };

            return encryptedFileObjects;

        } catch (error) {
            console.error('Erro ao criptografar arquivo:', error);
            throw error;
        }
    }

    async sendFileForEncryption(server, file, keyId) {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('Arquivo não fornecido'));
            }

            const FormData = require('form-data');
            const form = new FormData();
            
            try {
                // Adiciona o arquivo ao form
                form.append('file', file.buffer, {
                    filename: file.originalname || 'arquivo',
                    contentType: file.mimetype || 'application/octet-stream'
                });
                
                // Adiciona o keyId ao form
                form.append('keyId', keyId);

                const options = {
                    hostname: server.ip,
                    port: server.port,
                    path: '/encrypt/rsa',
                    method: 'POST',
                    headers: form.getHeaders(),
                    timeout: 5000 // 5 segundos de timeout
                };

                const req = http.request(options, (res) => {
                    let data = [];

                    res.on('data', (chunk) => {
                        data.push(chunk);
                    });

                    res.on('end', () => {
                        const responseData = Buffer.concat(data);

                        if (res.statusCode === 200) {
                            resolve(responseData);
                        } else {
                            let errorMessage = `Erro ao criptografar arquivo: ${res.statusCode}`;
                            try {
                                const errorData = JSON.parse(responseData.toString());
                                errorMessage += ` - ${errorData.message || ''}`;
                                console.error('Detalhes do erro:', errorData);
                            } catch (e) {
                                console.error('Resposta do servidor (texto):', responseData.toString());
                            }
                            reject(new Error(errorMessage));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error("Erro na requisição:", error);
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout ao criptografar arquivo'));
                });

                // Envia o form
                form.pipe(req);
            } catch (error) {
                console.error('Erro ao preparar o formulário:', error);
                reject(error);
            }
        });
    }

    async decryptFile(userId, file) {
        try {
            // 1. Buscar informações do usuário pelo ID
            const [user] = await sequelize.query(
                `SELECT server_name_1, key_reference_1, server_name_2, key_reference_2 
                FROM users WHERE id = :userId`,
                {
                    replacements: { userId },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // 2. Verificar servidores online
            const servers = [
                { name: user.server_name_1, keyId: user.key_reference_1 },
                { name: user.server_name_2, keyId: user.key_reference_2 }
            ];

            const isServer1Online = await this.ping(servers[0].name);
            const isServer2Online = await this.ping(servers[1].name);

            if (!isServer1Online && !isServer2Online) {
                throw new Error('Nenhum servidor está online para descriptografia');
            }

            let onlineServer = null;

            if (isServer1Online) {
                onlineServer = servers[0];
            } else {
                onlineServer = servers[1];
            }

            // 3. Dividir o arquivo criptografado em duas partes
            const fileLength = file.buffer.length / 2;
            const encryptedPart1 = file.buffer.slice(0, fileLength);
            const encryptedPart2 = file.buffer.slice(fileLength);

            const encryptedPart = isServer1Online ? encryptedPart1 : encryptedPart2;

            const server = this.servers.find(s => s.name === onlineServer.name);

            // 4. Enviar para descriptografia no servidor online
            const decryptedFile = await this.sendFileForDecryption(server, encryptedPart, onlineServer.keyId);

            return {
                buffer: decryptedFile,
                originalname: file.originalname.replace('.enc', ''),
                mimetype: 'application/octet-stream'
            };

        } catch (error) {
            console.error('Erro ao descriptografar arquivo:', error);
            throw error;
        }
    }

    async sendFileForDecryption(server, file, keyId) {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('Arquivo não fornecido'));
            }

            const FormData = require('form-data');
            const form = new FormData();
            
            try {
                // Adiciona o arquivo ao form
                form.append('file', file, {
                    filename: 'encrypted_file',
                    contentType: 'application/octet-stream'
                });
                
                // Adiciona o keyId ao form
                form.append('keyId', keyId);

                const options = {
                    hostname: server.ip,
                    port: server.port,
                    path: '/decrypt/rsa',
                    method: 'POST',
                    headers: form.getHeaders(),
                    timeout: 5000 // 5 segundos de timeout
                };

                const req = http.request(options, (res) => {
                    let data = [];

                    res.on('data', (chunk) => {
                        data.push(chunk);
                    });

                    res.on('end', () => {
                        const responseData = Buffer.concat(data);

                        if (res.statusCode === 200) {
                            resolve(responseData);
                        } else {
                            let errorMessage = `Erro ao descriptografar arquivo: ${res.statusCode}`;
                            try {
                                const errorData = JSON.parse(responseData.toString());
                                errorMessage += ` - ${errorData.message || ''}`;
                                console.error('Detalhes do erro:', errorData);
                            } catch (e) {
                                console.error('Resposta do servidor (texto):', responseData.toString());
                            }
                            reject(new Error(errorMessage));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error("Erro na requisição:", error);
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout ao descriptografar arquivo'));
                });

                // Envia o form
                form.pipe(req);
            } catch (error) {
                console.error('Erro ao preparar o formulário:', error);
                reject(error);
            }
        });
    }
}

module.exports = new ServerManagementService();
