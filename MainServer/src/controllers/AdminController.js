const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const EmailService = require('../services/EmailService');
const ServerManagementService = require('../services/ServerManagementService');
const os = require('os');

class AdminController {
    async createUser(req, res) {
        try {
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).json({ error: 'Nome e email são obrigatórios' });
            }

            // Verifica se o usuário autenticado existe
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const adminId = req.user.userId;

            // Verifica se o usuário já existe
            const [existingUser] = await sequelize.query('SELECT * FROM users WHERE name = :name', {
                    replacements: { name },
                    type: QueryTypes.SELECT
                }
            );

            if (existingUser) {
                return res.status(400).json({ error: 'Usuário já existe' });
            }
            
            // Insere o novo usuário com status pendente
            await sequelize.query(
                `INSERT INTO users (name, email, status, role_id, created_by)
                VALUES (:name, :email, 'pending', 1, :adminId)
                RETURNING id, name, email`,
                {
                    replacements: { 
                        name,
                        email,
                        adminId
                    },
                    type: QueryTypes.INSERT
                }
            );

            const [newUser] = await sequelize.query('SELECT id FROM users WHERE name = :name', {
                    replacements: { name },
                    type: QueryTypes.SELECT
                }
            );

            // Gera um código de verificação único
            const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
            const codeExpiration = new Date();
            codeExpiration.setHours(codeExpiration.getHours() + 2); // Código válido por 2 horas

            // Armazena o código no banco de dados
            await sequelize.query(
                `INSERT INTO verification_codes (user_id, code, expires_at)
                VALUES (:user_id, :code, :expiresAt)`,
                {
                    replacements: {
                        user_id: newUser.id,
                        code: verificationCode,
                        expiresAt: codeExpiration
                    },
                    type: QueryTypes.INSERT
                }
            );

            // Envia o email com o link para definição de senha
            await EmailService.sendPasswordResetLink({ name, email }, verificationCode);

            return res.status(201).json({ 
                message: 'Usuário criado com sucesso. Um email foi enviado para definição de senha.'
            });

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getUsers(req, res) {
        try {
            const users = await sequelize.query(
                'SELECT id, name, email, status FROM users',
                {
                    type: QueryTypes.SELECT
                }
            );

            return res.status(200).json({ users });
        } catch (error) {
            console.error('Erro ao obter usuários:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async deleteUser(req, res) {
        try {
            const { id } = req.params;

            await sequelize.query('UPDATE users SET status = :status WHERE id = :id', {
                replacements: { id, status: 'deleted' },
                type: QueryTypes.UPDATE
            });

            return res.status(200).json({ message: 'Usuário deletado com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getLogs(req, res) {
        try {
            const { userId, endpoint, status, startDate, endDate } = req.query;
            
            const logs = await LogService.getLogs({
                userId: userId ? parseInt(userId) : null,
                endpoint,
                status,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            });
    
            return res.json(logs);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            return res.status(500).json({ error: 'Erro ao buscar logs' });
        }
    }

    async cleanLogs(req, res) {
        try {
            const { beforeDate } = req.body;
            
            if (!beforeDate) {
                return res.status(400).json({ error: 'Data limite é obrigatória' });
            }

            const dataLimite = new Date(beforeDate);
            const dataMinima = new Date();
            dataMinima.setMonth(dataMinima.getMonth() - 2);

            if (dataLimite > dataMinima) {
                return res.status(400).json({ 
                    error: 'A data limite deve ser de pelo menos 2 meses atrás' 
                });
            }

            const count = await LogService.cleanOldLogs(dataLimite);
            return res.json({ message: `${count} logs foram removidos` });
        } catch (error) {
            console.error('Erro ao limpar logs:', error);
            return res.status(500).json({ error: 'Erro ao limpar logs' });
        }
    }

    async getStatus(req, res) {
        try {
            // Informações do MainServer
            const mainServerInfo = {
                status: 'active',
                uptime: process.uptime(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                },
                cpu: {
                    cores: os.cpus().length,
                    load: os.loadavg()
                },
                database: {
                    status: 'connected'
                }
            };

            // Verificar status dos HSMs
            const hsmStatus = {};
            const servers = ServerManagementService.getServers();
            
            for (const server of servers) {
                try {
                    const isOnline = await ServerManagementService.ping(server.name);
                    hsmStatus[server.name] = isOnline ? 'active' : 'offline';
                } catch (error) {
                    hsmStatus[server.name] = 'offline';
                }
            }

            // Verificar conexão com o banco de dados
            try {
                await sequelize.authenticate();
            } catch (error) {
                mainServerInfo.database.status = 'disconnected';
            }

            return res.status(200).json({
                mainServer: mainServerInfo,
                hsmServers: hsmStatus,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao obter status:', error);
            return res.status(500).json({ error: 'Erro ao obter status do sistema' });
        }
    }
}

module.exports = new AdminController();
