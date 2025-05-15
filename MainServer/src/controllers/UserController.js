const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const EmailService = require('../services/EmailService');
const { JWT_SECRET } = require('../config/jwt');

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

            return res.json({ message: 'Senha atualizada com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new UserController();