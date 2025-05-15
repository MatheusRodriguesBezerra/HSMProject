const LogService = require('../services/LogService');

/**
 * Middleware para registrar logs de requisições
 */
const logRequest = async (req, res, next) => {
    // Armazena o timestamp original da resposta
    const originalSend = res.send;
    let responseBody;

    // Sobrescreve o método send para capturar o status da resposta
    res.send = function (body) {
        responseBody = body;
        res.send = originalSend;
        return res.send(body);
    };

    // Quando a resposta for finalizada, registra o log
    res.on('finish', async () => {
        try {
            const userId = req.user?.userId; // ID do usuário se autenticado
            const endpoint = `${req.method} ${req.originalUrl}`;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const status = res.statusCode.toString();

            await LogService.createLog({
                userId,
                endpoint,
                ipAddress,
                status
            });
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    });

    next();
};

module.exports = logRequest; 