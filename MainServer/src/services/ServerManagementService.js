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
                console.log(`Status do ping para ${serverName}: ${res.statusCode}`);
                resolve(res.statusCode === 200);
            });

            req.on('error', (error) => {
                console.log(`Erro no ping para ${serverName}: ${error.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                console.log(`Timeout no ping para ${serverName}`);
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
                    console.log(`Par de chaves gerado no servidor ${server.name}: ${keyId}`);
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

                console.log(`Resposta do servidor ${server.name}: ${res}`);
                
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
}

module.exports = new ServerManagementService();
