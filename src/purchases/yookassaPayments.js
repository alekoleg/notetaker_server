const axios = require('axios')
const { grantEntitlementToRevenueCat } = require('./revenueCatPayments')


Parse.Cloud.define("createYookassaPayment", async (request) => {
  const { token, amount, description, deviceId, revenueCatId, duration } = request.params;
  const user = request.user;
  // console.log('Starting payment creation', { user, amount, description, deviceId, revenueCatId, duration });

  if (user == null) {
    throw new Parse.Error(Parse.Error.MISSING_CONTENT_TYPE, 'User is required');
  }

  // Получаем конфигурационные данные Yookassa
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  // Формируем базовую авторизацию
  const auth = {
    username: shopId,
    password: secretKey
  };

  const email = user.get("email") ?? "help@devotionals.app";

  try {
    // Параметры для создания платежа
    const paymentData = {
      amount: {
        value: amount,
        currency: "RUB"
      },
      description: description,
      capture: true,
      payment_token: token,
      save_payment_method: true,
      confirmation: {
        type: "redirect",
        return_url: "readings://yookassa/callback" // URL для мобильного редиректа
      },
      metadata: {
        userId: user ? user.id : null,
        deviceId: deviceId,
        revenueCatId: revenueCatId
      },
      receipt: formReceipt(amount, email, description),
    };

    // console.log('Sending request to Yookassa API', {
    //   amount: paymentData.amount.value
    // });

    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      paymentData,
      {
        auth,
        headers: {
          "Idempotence-Key": token,
          'Content-Type': 'application/json'
        }
      }
    );

    // console.log('Payment created successfully', response.data);
    try {
      await storeYookassaPayment(token, response.data.status, response.data, deviceId, user, revenueCatId);
    } catch (error) {
      // console.error('Error storing payment', error);
    }

    if (response.data.status === "succeeded") {
      await grantEntitlementToRevenueCat(revenueCatId, process.env.YOOKASSA_REVENUECAT_ENTITLEMENT_ID, duration);
      if (getPaymentMethodId(response) != null) {
        await saveYookassaSubscription(user, getPaymentMethodId(response), duration, amount, response.data.payment_method.card.last4);
      }
    }

    var requestResponse = {
      id: response.data.id,
      status: response.data.status,
      confirmationUrl: response.data.confirmation?.confirmation_url,
    }
    if (getPaymentMethodId(response) != null) {
      requestResponse.savedPaymentMethodId = getPaymentMethodId(response);
    }

    return requestResponse;

  } catch (error) {
    // console.error('Error creating payment', error);
    throw new Parse.Error(Parse.Error.INVALID_JSON, 'Error creating payment');
  }
});

Parse.Cloud.define("checkYookassaPayment", async (request) => {
  const { token, paymentId, deviceId, revenueCatId, duration, amount } = request.params;
  const user = request.user;
  // console.log('Checking payment status', { token });
  // console.log('duration', duration);

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  const auth = {
    username: shopId,
    password: secretKey
  };

  try {
    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${paymentId}`,
      { auth, headers: { "Idempotence-Key": token } }
    );

    // console.log('Payment status checked', response.data);

    try {
      await storeYookassaPayment(token, response.data.status, response.data, deviceId, user, revenueCatId);
    } catch (error) {
      // console.error('Error storing payment', error);
    }

    if (response.data.status === "succeeded") {
      await grantEntitlementToRevenueCat(revenueCatId, process.env.YOOKASSA_REVENUECAT_ENTITLEMENT_ID, duration);
      if (getPaymentMethodId(response) != null) {
        await saveYookassaSubscription(user, getPaymentMethodId(response), duration, amount, response.data.payment_method.card.last4);
      }
    }

    var requestResponse = {
      id: response.data.id,
      status: response.data.status,
      confirmationUrl: response.data.confirmation?.confirmation_url,
    }

    if (getPaymentMethodId(response) != null) {
      requestResponse.savedPaymentMethodId = getPaymentMethodId(response);
    }

    return requestResponse;
  } catch (error) {
    // console.error('Error checking payment', error);
    throw new Parse.Error(Parse.Error.INVALID_JSON, 'Error checking payment');
  }
});


Parse.Cloud.define("renewYookassaSubscriptionIfNeeded", async (request) => {
  const userId = request.params.app_user_id;
  // console.log('Checking subscription renewal for user:', userId);

  if (userId == null) {
    // console.log('User ID is missing');
    throw new Parse.Error(Parse.Error.INVALID_JSON, 'User ID is required');
  }

  if (request.params.type == "EXPIRATION" || request.params.type == "CANCELLATION") {
    // console.log('Processing subscription renewal for type:', request.params.type);
    
    const query = new Parse.Query(Parse.User);
    query.equalTo("objectId", userId);
    query.include("yk_subscription");
    const user = await query.first({ useMasterKey: true });

    if (user.get("yk_subscription") == null) {
      // console.log('No subscription found for user');
      return;
    }

    const subscription = user.get("yk_subscription");
    const duration = subscription.get("duration_days");
    const price = subscription.get("price");
    const paymentMethodId = subscription.get("yPaymentMethod");
    const status = subscription.get("yPaymentStatus");

    // console.log('Found subscription:', {
    //   duration,
    //   price,
    //   paymentMethodId,
    //   status
    // });

    if (status == false || paymentMethodId == null) {
      // console.log('Invalid subscription status or missing payment method');
      return;
    }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = {
      username: shopId,
      password: secretKey
    };

    const email = user.get("email") ?? "help@devotionals.app";

    const paymentData = {
      amount: {
        value: price,
        currency: "RUB"
      },
      description: "Продление подписки",
      capture: true,
      payment_method_id: paymentMethodId,
      receipt: formReceipt(price, email, "Продление подписки"),
    }
    const idempotenceKey = Math.random().toString(36).substring(2, 15);

    // console.log('Attempting to create payment with data:', paymentData);

    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      paymentData,
      { auth, headers: { "Idempotence-Key": idempotenceKey } }
    );

    // console.log('Payment created successfully', response.data);

    try {
      // console.log('Storing payment record');
      await storeYookassaPayment(paymentMethodId, response.data.status, response.data, null, user, user.id);
    } catch (error) {
      // console.error('Error storing payment', error);
    }

    if (response.data.status === "succeeded") {
      // console.log('Payment succeeded, granting entitlement');
      await grantEntitlementToRevenueCat(user.id, process.env.YOOKASSA_REVENUECAT_ENTITLEMENT_ID, duration);
    } else {
      // console.log('Payment failed, removing subscription');
      user.set("yk_subscription", null);
      await user.save(null, { useMasterKey: true });
      subscription.destroy({ useMasterKey: true });
    }    
  }
  // console.log('Subscription renewal check completed');
  return;
});


function getPaymentMethodId(response) {
  if (response.data.payment_method?.saved) {
    return response.data.payment_method.id;
  }
  return null;
}

async function saveYookassaSubscription(user, paymentMethodId, duration, price, last4) {

  var subscription = user.get("yk_subscription");
  if (subscription == null) {
    subscription = new Parse.Object("yk_subscription");
  } else {
    subscription = await subscription.fetch();
  }
  subscription.set("user", user);
  subscription.set("yPaymentMethod", paymentMethodId);
  subscription.set("duration_days", duration);
  subscription.set("price", price);
  subscription.set("last4", last4);
  subscription.set("yPaymentStatus", true);
  await subscription.save(null, { useMasterKey: true });
  user.set("yk_subscription", subscription);
  await user.save(null, { useMasterKey: true });
}

async function storeYookassaPayment(token, status, data, deviceId, user, revenueCatId) {

  const query = new Parse.Query("yk_payments");
  query.equalTo("token", token);
  var payment = await query.first();

  if (!payment) {
    payment = new Parse.Object("yk_payments");
  }

  payment.set("token", token);
  payment.set("status", status);
  payment.set("raw_data", JSON.stringify(data));
  payment.set("device_id", deviceId);
  if (user) {
    payment.set("user", user);
  }
  payment.set("revenue_cat_id", revenueCatId);
  await payment.save();
}

function formReceipt(amount, email, description) {
  return {
    "customer": {
      "email": email
    },
    "items": [
      {
        "description": description,
        "quantity": 1,
        "amount": {
          "value": amount,
          "currency": "RUB"
        },
        "vat_code": 1
      }
    ]
  }
}