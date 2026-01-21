const axios = require('axios')

function sanitizeKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeKeys);
    }
    if (value && typeof value === 'object') {
        const sanitizedObject = {};
        for (const [rawKey, nestedValue] of Object.entries(value)) {
            const safeKey = rawKey.replace(/\$/g, '_').replace(/\./g, '_');
            sanitizedObject[safeKey] = sanitizeKeys(nestedValue);
        }
        return sanitizedObject;
    }
    return value;
}
ClassNameUserSubscriprion = "UserSubscriprion";
KeyIsActive = "isActive";
KeyUserId = "userId";
KeyRawData = "rawData";
KeyUpdatedAt = "updatedAt";
KeySubscription = "subscription";

exports.verifySubscription = async function(request) {

    if (isRequestFromDashboard(request)) {
        return;
    }    

    const user = request.user;
    const userId = user._getId();
    
    // console.log(JSON.stringify(userId));
    
    const query = new Parse.Query(ClassNameUserSubscriprion);
    query.equalTo(KeyUserId, userId);
    var userSubscription = await query.first({useMasterKey: true});
    const currentDate = new Date();
    // var 

    if (ifSubscriptionNeededToBeRefreshed(userSubscription)) {
        const httpResponse = await axios.get(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
            headers: {
                Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        })

        const data = httpResponse.data;
        const subscriptions = data["subscriber"]["subscriptions"]

        var hasValidSubscription = false
        for (var key in subscriptions) {
            var subscription = subscriptions[key];
            if (!hasValidSubscription) {
                const date = new Date(subscription["expires_date"]);
                // console.log("expires date" + date);
                hasValidSubscription = currentDate.getTime() <= date.getTime();
            }
        }

        if (userSubscription == null) {
            userSubscription = new Parse.Object(ClassNameUserSubscriprion);
        }

        userSubscription.set(KeyIsActive, hasValidSubscription);
        userSubscription.set(KeyUserId, userId);
        userSubscription.set(KeyRawData, sanitizeKeys(data));

        await userSubscription.save({}, {useMasterKey: true});
        user.set(KeySubscription, userSubscription);
        await user.save({}, {useMasterKey: true});

        // console.log("ответ" + JSON.stringify(data));
    }

    // console.log("subscription" + userSubscription);

    hasValidSubscription = userSubscription.get("isActive");
    if (!hasValidSubscription) {
        throw "NO_SUBSCRIPTION_ERROR";
    }
}


function ifSubscriptionNeededToBeRefreshed(subscription) {
    //console.log("need to be updated - " + subscription);
    if (subscription == null) { return true; }
    const updateDate = new Date(subscription.get(KeyUpdatedAt));
    const currentDate = new Date();
    // 1 hour (in milliseconds)
    const chacheTime = 1 * 60 * 60 * 100
    const needToBeUpdated = subscription.get(KeyIsActive) == false || updateDate.getTime() < (currentDate.getTime() - chacheTime);
    // console.log("needToBeUpdated - " + needToBeUpdated);
    return needToBeUpdated
}

function isRequestFromDashboard(request) {
    return request["headers"] != null && request["headers"]["origin"] != null && request["headers"]["origin"].includes("0.0.0.0")
}
