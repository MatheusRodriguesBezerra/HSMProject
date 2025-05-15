const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const { JWT_SECRET } = require('../config/jwt');

class AuthController {
    async login(req, res) {
        try {
            const { name, password } = req.body;

            if (!name || !password) {
                return res.status(400).json({ error: 'Nome e password são obrigatórios' });
            }

            // Busca o usuário usando a função login do PostgreSQL
            const [result] = await sequelize.query(`SELECT * FROM login(:name, :password)`,{
                    replacements: { name, password },
                    type: QueryTypes.SELECT
                }
            );

            if (!result || !result.is_valid) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // Gera o token JWT com validade de 1 hora
            const token = jwt.sign({ 
                    userId: result.id,
                    type: "login"
                },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.json({
                token
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new AuthController(); 