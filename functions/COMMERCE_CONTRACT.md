# Commerce service contract

This implementation has not been deployed. Existing live data is not migrated automatically.

## Inventory

`inventory/{sha256(JSON.stringify([productId,colorName,optionName]))}` is private and contains available `stock`, `reserved`, `sold`, and `version`. `stockAvailability/{sameId}` publishes only product/color/size, `available`, and update time. Each operation increments the version and writes an independent `inventoryMovements` record atomically.

`setVariantStock({productId,colorName,optionName,stock,expectedVersion,requestId})` requires a verified administrator. Stock is the available count, excluding reserved units. An uninitialized combination has version 0. A saved version is at least 1. A stale expectedVersion fails instead of overwriting a customer order. The request ID is unique per intentional change and reusable on network retry. No old `products.options.stock` allocation is inferred. Registered sizes are `product.sizeOptions`, falling back to `product.options`; unregistered, hidden, or >200-combination products cannot initialize stock.

## Orders and recovery

`createBankTransferOrder({cart,customer,expectedTotal,idempotencyKey,guestAccessToken})`. Both keys must be generated from at least 32 random bytes and encoded as base64url or hex. Cart lines contain `{variantId,productId,colorName,optionName,quantity}`. Identical requests return the original order; changed contents with the same key fail. Keys must survive an uncertain network response. Server source-of-truth price, shipping, registered SKU and inventory are checked in one transaction. New orders have `schemaVersion:2`. No secrets are written in public order documents.

`getOrder({orderId,guestAccessToken})` permits the owner, a verified administrator, or the recovery secret. `getOrder({idempotencyKey,guestAccessToken})` can recover a committed order before the client received its ID. A secret hash is stored separately in server-only `orderAccess`; `orderRequests` stores only fingerprint/ID and creation time. Returned data contains products, price, bank/deadline, state, tracking and masked recipient/phone; it omits full address and cash-receipt identity.

For an unresolved request, `getOrder({idempotencyKey,guestAccessToken,abortIfMissing:true})` atomically closes a missing request with a cancellation fence and returns `{attemptClosed:true}`. A delayed create using that key then fails. If creation committed first, recovery returns the existing order. This is the only safe path to discard an uncertain attempt and start over; a plain not-found response alone must not reset the key.

All production `getOrder` calls require App Check, including signed-in owners and correct recovery-token holders. Only the explicit emulator configuration bypasses this gate. Lookup is limited to 120 attempts/hour per IP and per authenticated UID, including not-found, wrong-token and recovery-fence attempts. Create requests are limited to 10 attempts/hour per IP and per authenticated UID, including validation failures and idempotent retries. The counters commit in a separate transaction before validation, so a rejected order cannot roll back its count. Once capped, no new tombstone or counter writes are performed. The limits reduce abuse but cannot replace provider quotas and budget alerting.

## State operations

`updateOrder({orderId,action,payload,expectedStatus})` is server-only/admin authorized. A changed current status fails with `aborted`. Legacy orders require a deliberate inventory migration before mutation.

- `status`, `{status}`: 입금 대기 → 입금 확인 → 상품 준비중 → 발송 완료 → 배송완료. Only 입금 대기 can go directly to 주문 취소. Expired deposits cannot be confirmed. Shipment must already be saved.
- `status`, `{status:'환불요청'}`: allowed after payment and before shipment.
- `status`, `{status:'반품요청'}`: allowed after shipment or delivery.
- `status`, `{status:'반품입고',restock:boolean,note}`: explicit physical inspection. Reusable returned stock is restored only if restock is true. Damaged goods reduce sold but do not become available.
- `shipment`, `{courier,trackingNumber}`: allowed after payment; saves tracking only, does not mark shipped automatically.
- `receipt`, `{status,reference}`: records an actual external receipt issue/cancellation. A reference is required. This does not issue a tax receipt.
- `refund`, `{amount,reference}`: records an actual full bank refund from 환불요청 or 반품입고. The exact full order amount and transfer reference are required. This does not transfer money. Pre-shipment refunds restore inventory once; return refunds do not restore it twice.

The scheduled expiry worker runs every 5 minutes, examines at most 100 version-2 unpaid orders per invocation, and changes each order/inventory atomically. Payment and expiry race on the same order document. Its query needs the composite index `(schemaVersion ASC, status ASC, depositDeadlineAt ASC)`.

## Release requirements

- Node 22 target; HTTP maxInstances 10 and expiry maxInstances 1 are concurrency bounds, not spending caps.
- Verified administrator: verified email plus admin claim, settings/admin.adminUids, or the existing verified owner bootstrap email. Email allowlists are not used.
- Live customer ordering requires business, bank, purchase safety and policy confirmations plus nonempty terms/privacy/returns text. These values must be supplied by the operator, not test fixtures.
- Live customer ordering requires a valid Firebase App Check context. The emulator and authorized administrator test checkout are separate exceptions.
- Deploy the callable functions and matching restrictive rules/indexes before a compatible frontend. Retire the old `verifyPayment` function; removing its export alone does not delete an already deployed function.
- Old stock and orders require a reviewed migration; automatically assigning shared size stock across multiple colors is deliberately forbidden.
- Actual notification, bank refund, receipt provider, backups, TTL retention and deployment/billing settings need a separate operator configuration. Rate-limit records include expiresAt but TTL deletion must be configured explicitly.

## Tests

`npm test` runs synthetic tests with test files serialized; concurrent requests within the commerce integration test still execute in parallel. Core tests inject a serializable in-memory transaction adapter and never import Firebase or read credentials. Emulator suites require explicit loopback environment variables and otherwise skip. Firestore suites use `demo-likedzy-commerce`; callable and Storage suites use `demo-likedzy`. The Firestore SDK uses its local owner header with SSL disabled, only after validating a loopback host; metadata discovery is disabled. Every commerce run uses a unique administrator UID to isolate rate limits. Synthetic records remain in ephemeral emulator namespaces.

The callable suite exercises the actual Functions adapter, including the modular `Timestamp` and `FieldValue` imports. Rules suites check private reads, owner/admin access, forged writes, and Storage overwrite/type/size restrictions. See `docs/07_COMMERCE_VALIDATION.md` for the recorded result, startup commands and remaining release work. These local results do not verify deployed rules, indexes, App Check configuration or scheduled invocation.
