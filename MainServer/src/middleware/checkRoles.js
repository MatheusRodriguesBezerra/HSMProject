const sequelize = require('../database');
const { QueryTypes } = require('sequelize');

const checkAdminRole = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(403).json({ 
                message: 'Acesso negado. Usuário não autenticado.' 
            });
        }

        // Busca o role_id do usuário no banco de dados
        const [user] = await sequelize.query(
            'SELECT role_id FROM users WHERE id = :userId',
            {
                replacements: { userId: req.user.userId },
                type: QueryTypes.SELECT
            }
        );

        if (user && user.role_id === 2) {
            next();
        } else {
            return res.status(403).json({ 
                message: 'Acesso negado. Apenas administradores podem realizar esta ação.' 
            });
        }
    } catch (error) {
        console.error('Erro ao verificar role do usuário:', error);
        return res.status(500).json({ 
            message: 'Erro interno do servidor ao verificar permissões.' 
        });
    }
};

module.exports = checkAdminRole; 