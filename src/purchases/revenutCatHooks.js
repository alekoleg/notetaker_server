const axios = require('axios')
const Parse = require('parse/node');

Parse.initialize(process.env.APPLICATION_ID);
// необходимо задавать, так как revenueCatSubcriptionStatusHooksProxy вызывается как хук,
// и на прямую ходить не может в parse cloud
Parse.serverURL = process.env.SERVER_URL;
Parse.masterKey = process.env.MASTER_KEY;

Parse.Cloud.define("revenueCatSubcriptionStatusHooks", async (request) => {
    console.log('Cloud Function получила данные:', request.params);

    const product_id = request.params.webhookData.event.product_id;
    if (product_id != process.env.REVENUECAT_YOOKASSA_PRODUCT_ID) {
        Parse.Cloud.run("renewYookassaSubscriptionIfNeeded", request.params.webhookData.event);
    }

    return {};
});

exports.revenueCatSubcriptionStatusHooksProxy = async function(request, response) {
    if (request.headers['authorization'] !== process.env.REVENUECAT_WEBHOOK_AUTH_SECRET_FROM) {
        response.sendStatus(401);
        return;
    }

    try {
        // Используем мастер ключ для вызова Cloud функции
        const result = await Parse.Cloud.run("revenueCatSubcriptionStatusHooks", {
            webhookData: request.body
        }, { useMasterKey: true });
    } catch (error) { }

    response.sendStatus(200);
}