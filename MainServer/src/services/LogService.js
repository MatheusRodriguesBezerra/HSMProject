const { QueryTypes } = require('sequelize');
const sequelize = require('../database');

class LogService {
    static async createLog({ userId = null, endpoint, ipAddress, status }) {
        try {
            const [log] = await sequelize.query(
                `INSERT INTO logs (user_id, endpoint, ip_address, status)
                VALUES (:userId, :endpoint, :ipAddress, :status)
                RETURNING *`,
                {
                    replacements: { userId, endpoint, ipAddress, status },
                    type: QueryTypes.INSERT
                }
            );
            return log;
        } catch (error) {
            console.error('Erro ao criar log:', error);
            throw new Error('Não foi possível registrar o log');
        }
    }

    static async getLogs({ userId, endpoint, status, startDate, endDate }) {
        try {
            let query = 'SELECT * FROM logs WHERE 1=1';
            const replacements = {};

            if (userId) {
                query += ' AND user_id = :userId';
                replacements.userId = userId;
            }

            if (endpoint) {
                query += ' AND endpoint = :endpoint';
                replacements.endpoint = endpoint;
            }

            if (status) {
                query += ' AND status = :status';
                replacements.status = status;
            }

            if (startDate) {
                query += ' AND created_at >= :startDate';
                replacements.startDate = startDate;
            }

            if (endDate) {
                query += ' AND created_at <= :endDate';
                replacements.endDate = endDate;
            }

            query += ' ORDER BY created_at DESC';

            const logs = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            return logs;
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            throw new Error('Não foi possível buscar os logs');
        }
    }

    static async cleanOldLogs(beforeDate) {
        try {
            const [{ count }] = await sequelize.query(
                'DELETE FROM logs WHERE created_at < :beforeDate RETURNING COUNT(*)',
                {
                    replacements: { beforeDate },
                    type: QueryTypes.DELETE
                }
            );
            return count;
        } catch (error) {
            console.error('Erro ao limpar logs antigos:', error);
            throw new Error('Não foi possível limpar os logs antigos');
        }
    }
}

module.exports = LogService;
