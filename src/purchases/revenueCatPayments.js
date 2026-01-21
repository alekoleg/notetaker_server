const axios = require('axios')
/**
 * Асинхронная функция для выдачи прав через RevenueCat API
 * @param {string} revenueCatUserId - Идентификатор пользователя RevenueCat
 * @param {string} entitlementId - Идентификатор права для выдачи
 * @param {number} [durationDays=30] - Длительность действия в днях
 * @returns {Promise<Object>} Результат операции
 */
module.exports.grantEntitlementToRevenueCat = async function grantEntitlementToRevenueCat(revenueCatUserId, entitlementId, durationDays) {
    try {
        console.log('Начало grantEntitlementToRevenueCat', { revenueCatUserId, entitlementId, durationDays });

        // Конфигурация заголовков для RevenueCat
        const config = {
            headers: {
                // "X-Platform": "amazon",
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.REVENUECAT_SECRET_KEY}`
            }
        };
        console.log('Подготовлена конфигурация заголовков', { config });

        // Рассчет даты истечения
        const startDate = Date.now();
        const expiresDate = Date.now() + durationDays * 24 * 60 * 60 * 1000;
        console.log('Рассчитана дата истечения:', expiresDate);
        
        // Тело запроса
        const requestBody = {
            "start_time_ms": startDate,
            "end_time_ms": expiresDate,
            
        };
        console.log('Подготовлено тело запроса:', requestBody);

        // Выполнение POST-запроса
        // https://api.revenuecat.com/v1/subscribers/{app_user_id}/entitlements/{entitlement_identifier}/promotional
        console.log('Отправка запроса в RevenueCat...');
        const response = await axios.post(
            `https://api.revenuecat.com/v1/subscribers/${revenueCatUserId}/entitlements/${entitlementId}/promotional`,
            requestBody,
            config
        );
        console.log('Получен ответ от RevenueCat:', response.data);

        return response.data;
    } catch (error) {
        console.error('Ошибка в grantEntitlementToRevenueCat:', error.response?.data || error.message);
        // throw error;
    }
}
