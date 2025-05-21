const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Token não fornecido' 
            });
        }
        
        const decodedToken = jwt.verify(token, JWT_SECRET);

        if (decodedToken.type !== "login" && !decodedToken.userId) {
            return res.status(401).json({ 
                message: 'Token inválido' 
            });
        }

        // Verifica se o usuário está ativo
        const [user] = await sequelize.query(
            'SELECT status FROM users WHERE id = :userId',
            {
                replacements: { userId: decodedToken.userId },
                type: QueryTypes.SELECT
            }
        );

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                message: 'Usuário inativo ou não encontrado'
            });
        }

        req.user = decodedToken;
        
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: 'Token inválido' 
        });
    }
};

module.exports = authMiddleware;