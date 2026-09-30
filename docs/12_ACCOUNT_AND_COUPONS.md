# Account and coupon operations

- Members can store a name, contact number and one default delivery address in My account. Korea and Vietnam have separate address fields. Checkout fills matching-country details, or the buyer can choose to apply a saved address from another country and then recheck price and stock.
- Admins create a coupon at Admin → Coupons. Set code, market currency, percent, minimum product subtotal, maximum discount, total redemption count and local start/end time. The initial form suggests 30% for VND; saving a coupon is an intentional admin action.
- Customers must sign in to apply a coupon code at checkout. The UI displays a quote. The server recomputes the discount against current product prices and records the discounted amount. One member can use a code once; unpaid cancellation or expiry restores it.
- Coupon amounts are in the selected currency. Existing order prices and historical order names are snapshots and do not change when the site language changes.
