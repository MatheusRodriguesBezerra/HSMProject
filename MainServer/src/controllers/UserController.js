const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const EmailService = require('../services/EmailService');
const { JWT_SECRET } = require('../config/jwt');
const ServerManagementService = require('../services/ServerManagementService');

class UserController {
    async setPassword(req, res) {
        try {
            const { code } = req.params;
            const { newpwd } = req.body;

            if (!code || !newpwd) {
                return res.status(400).json({ error: 'Código e nova senha são obrigatórios' });
            }

            const [result] = await sequelize.query(`SELECT * FROM verification_codes WHERE code = :code`, {
                    replacements: { code },
                    type: QueryTypes.SELECT
                }
            );

            if (!result) {
                return res.status(400).json({ error: 'Código inválido ou expirado' });
            }

            // Chama a função de atualização de senha do banco de dados
            await sequelize.query('SELECT update_user_password(:p_user_id, :p_password)', {
                    replacements: {
                        p_user_id: result.user_id,
                        p_password: newpwd
                    },
                    type: QueryTypes.SELECT
                }
            );

            await sequelize.query('DELETE FROM verification_codes WHERE code = :code', {
                    replacements: {
                        code: code
                    },
                    type: QueryTypes.DELETE
                }
            );

            await ServerManagementService.createKeyPair(result.user_id);

            return res.json({ message: 'Senha atualizada com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async signFile(req, res) {
        try {
            if (!req.user.userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
            }

            if (!req.file.buffer && !req.file.path) {
                return res.status(400).json({ error: 'Arquivo inválido: sem buffer ou path' });
            }

            const result = await ServerManagementService.signFile(req.user.userId, req.file);

            console.log('result', result);

            // Unir as assinaturas em um único arquivo
            const combinedSignature = Buffer.concat([
                result.signature1.buffer,
                result.signature2.buffer
            ]);

            // Criar um único arquivo de assinatura
            const signatureFile = {
                buffer: combinedSignature,
                originalname: `${req.file.originalname}.sig`,
                mimetype: 'application/octet-stream'
            };

            // Configurar o cabeçalho para download do arquivo
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${signatureFile.originalname}`);
            
            return res.send(signatureFile.buffer);
        } catch (error) {
            console.error('Erro ao assinar arquivo:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async verifySignature(req, res) {
        try {
            if (!req.user.userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const { userName } = req.body;

            if (!userName) {
                return res.status(400).json({ error: 'Nome do usuário é obrigatório' });
            }

            if (!req.files || !req.files.file || !req.files.signature) {
                return res.status(400).json({ error: 'Arquivo e assinatura são obrigatórios' });
            }

            console.log('req.files', req.files);

            const file = req.files.file[0];
            const signatureFile = req.files.signature[0];

            console.log('file', file);
            console.log('signatureFile', signatureFile);

            if (!file || !signatureFile) {
                return res.status(400).json({ error: 'Arquivo ou assinatura inválidos' });
            }

            const result = await ServerManagementService.verifySignature(userName, file, signatureFile);

            return res.json(result);
        } catch (error) {
            console.error('Erro ao verificar assinatura:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new UserController();