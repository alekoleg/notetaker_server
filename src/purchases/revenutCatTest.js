require('dotenv').config();

const { grantEntitlementToRevenueCat } = require('./revenueCatPayments')

async function main() {
  await grantEntitlementToRevenueCat('$RCAnonymousID:9e165359011740f2b3ca299080606da8', 'entlb6df74f2d6', 30)
}

main()