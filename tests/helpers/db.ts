import { db } from "@/lib/db";

/** Esvazia o banco de teste, das tabelas filhas para as pais. */
export async function resetDb() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.shipment.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.product.deleteMany(),
    db.paymentCard.deleteMany(),
    db.address.deleteMany(),
    db.recoveryCode.deleteMany(),
    db.passwordResetToken.deleteMany(),
    db.session.deleteMany(),
    db.rateLimit.deleteMany(),
    db.user.deleteMany(),
  ]);
}
