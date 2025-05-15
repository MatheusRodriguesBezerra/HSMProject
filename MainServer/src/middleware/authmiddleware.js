const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Token não fornecido' 
            });
        }
        
        const decodedToken = jwt.verify(token, JWT_SECRET);
        req.user = decodedToken;
        
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: 'Token inválido' 
        });
    }
};

module.exports = authMiddleware;