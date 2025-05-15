const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const EmailService = require('../services/EmailService');

class AdminController {
    async createUser(req, res) {
        try {
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).json({ error: 'Nome e email são obrigatórios' });
            }

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
                `INSERT INTO users (name, email, status, role_id)
                VALUES (:name, :email, 'pending', 1)
                RETURNING id, name, email`,
                {
                    replacements: { 
                        name,
                        email,
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

            await sequelize.query('DELETE FROM users WHERE id = :id', {
                replacements: { id },
                type: QueryTypes.DELETE
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
}

module.exports = new AdminController();
