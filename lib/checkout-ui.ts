import type { Locale } from "@/lib/types";

export type CheckoutPurchase = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED" | "CANCELLED";
  originalAmountCents: number;
  discountAmountCents: number;
  amountCents: number;
  currency: string;
  expectedAmount: string | null;
  receivedAmount: string | null;
  payCurrency: string | null;
  network: string | null;
  paymentAddress: string | null;
  providerStatus: string | null;
  expiresAt: string | null;
  transactionHash: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    course: { slug: string; titleEn: string; titleAr: string; image: string };
  }[];
};

export const terminalPaymentStatuses = new Set<CheckoutPurchase["status"]>([
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
  "CANCELLED",
]);
export function isTerminalPaymentStatus(status: CheckoutPurchase["status"]) {
  return terminalPaymentStatuses.has(status);
}

export function checkoutStatusKey(purchase: CheckoutPurchase) {
  if (purchase.status === "PAID") return "paid";
  if (purchase.status === "EXPIRED") return "expired";
  if (purchase.status === "FAILED") return "failed";
  if (purchase.status === "REFUNDED") return "refunded";
  if (purchase.status === "CANCELLED") return "cancelled";
  const provider = purchase.providerStatus?.toLowerCase();
  if (provider === "confirming") return "confirming";
  if (provider === "confirmed") return "confirmed";
  if (provider === "sending") return "sending";
  if (provider === "partially_paid") return "partiallyPaid";
  return "waiting";
}

const en = {
  checkout: "Secure checkout",
  summary: "Order summary",
  originalPrice: "Original price",
  discount: "Discount",
  finalPrice: "Final USD amount",
  paymentMethod: "Payment method",
  loading: "Loading your secure payment...",
  unavailable: "This purchase could not be displayed.",
  back: "Back to my purchases",
  amount: "Amount",
  sendExactly: "Send exactly this amount",
  network: "Network",
  networkName: "TRON (TRC20)",
  address: "Payment address",
  warning:
    "Only send USDT using the TRON (TRC20) network. Sending funds using another network may result in permanent loss.",
  copyAmount: "Copy amount",
  copyAddress: "Copy address",
  copyHash: "Copy transaction hash",
  copied: "Copied",
  qrAlt: "QR code containing the exact payment address",
  waiting: "Waiting for payment",
  waitingBody:
    "Send the exact amount to the address below. This page updates automatically.",
  confirming: "Payment detected. Waiting for blockchain confirmations.",
  confirmed: "Payment confirmed on the network. Finalizing your order.",
  sending: "Payment confirmed. Finalizing settlement.",
  partiallyPaid: "Partial payment received",
  received: "Received",
  required: "Required",
  paid: "Payment successful",
  paidBody: "Your payment was verified by the server.",
  expired: "Payment expired",
  expiredBody:
    "This address should not be reused. Start a new payment attempt from the course page.",
  failed: "Payment failed",
  failedBody:
    "No access was granted. You can safely start a new payment attempt.",
  refunded: "Payment refunded",
  refundedBody: "This purchase has been refunded.",
  cancelled: "Payment cancelled",
  cancelledBody: "This payment attempt was cancelled.",
  retry: "Start a new payment",
  goCourses: "Go to My Courses",
  viewPurchase: "View purchase",
  transaction: "Transaction hash",
  updated: "Updated",
  expiresIn: "Payment expires in",
  checking: "Checking payment status...",
  refreshError: "Unable to refresh payment status. Retrying...",
  noExpiry: "Complete the transfer while the provider payment remains active.",
  usdt: "USDT",
  couponAfter: "Coupon discounts are verified and calculated by the server.",
  errors: {
    EMAIL_VERIFICATION_REQUIRED:
      "Verify your email before completing a purchase.",
    ALREADY_OWNED: "You already own this course.",
    INVALID_COURSE: "This course is not available.",
    INVALID_COUPON: "This coupon is invalid or expired.",
    COUPON_NOT_ELIGIBLE: "This coupon does not apply to this course.",
    COUPON_USAGE_LIMIT: "This coupon has reached its usage limit.",
    COUPON_USER_LIMIT: "You have reached the usage limit for this coupon.",
    MINIMUM_ORDER_NOT_MET: "This order does not meet the coupon minimum.",
    COUPON_CURRENCY_MISMATCH: "This coupon cannot be used with this currency.",
    ZERO_VALUE_CHECKOUT_UNSUPPORTED:
      "This discount cannot be used for this payment.",
    INVALID_INPUT: "Please check the checkout details and try again.",
    PAYMENT_UNAVAILABLE: "Payments are temporarily unavailable.",
    CHECKOUT_CONFLICT: "Checkout could not be created. Please try again.",
    CSRF_REJECTED: "Please refresh the page and try again.",
    default: "The payment request could not be completed. Please try again.",
  },
};
const ar: typeof en = {
  checkout: "دفع آمن",
  summary: "ملخص الطلب",
  originalPrice: "السعر الأصلي",
  discount: "الخصم",
  finalPrice: "المبلغ النهائي بالدولار",
  paymentMethod: "طريقة الدفع",
  loading: "جارٍ تحميل عملية الدفع الآمنة...",
  unavailable: "تعذر عرض عملية الشراء هذه.",
  back: "العودة إلى مشترياتي",
  amount: "المبلغ المطلوب",
  sendExactly: "أرسل هذا المبلغ بالضبط",
  network: "الشبكة",
  networkName: "شبكة TRON ‏(TRC20)",
  address: "عنوان الدفع",
  warning:
    "أرسل USDT عبر شبكة TRON ‏(TRC20) فقط. قد يؤدي الإرسال عبر شبكة أخرى إلى فقدان الأموال بشكل دائم.",
  copyAmount: "نسخ المبلغ",
  copyAddress: "نسخ العنوان",
  copyHash: "نسخ معرّف المعاملة",
  copied: "تم النسخ",
  qrAlt: "رمز QR يحتوي على عنوان الدفع الكامل",
  waiting: "بانتظار الدفع",
  waitingBody:
    "أرسل المبلغ المطلوب بالضبط إلى العنوان أدناه. يتم تحديث هذه الصفحة تلقائياً.",
  confirming: "تم اكتشاف عملية الدفع. بانتظار تأكيدات الشبكة.",
  confirmed: "تم تأكيد الدفع على الشبكة. جارٍ إكمال طلبك.",
  sending: "تم تأكيد الدفع. جارٍ إكمال التسوية.",
  partiallyPaid: "تم استلام جزء من المبلغ",
  received: "المبلغ المستلم",
  required: "المبلغ المطلوب",
  paid: "تم الدفع بنجاح",
  paidBody: "تم التحقق من دفعتك من خلال الخادم.",
  expired: "انتهت صلاحية عملية الدفع",
  expiredBody:
    "لا تعد استخدام هذا العنوان. ابدأ محاولة دفع جديدة من صفحة الدورة.",
  failed: "فشلت عملية الدفع",
  failedBody: "لم يتم منح أي وصول. يمكنك بدء محاولة دفع جديدة بأمان.",
  refunded: "تم رد المبلغ",
  refundedBody: "تم رد مبلغ عملية الشراء هذه.",
  cancelled: "تم إلغاء عملية الدفع",
  cancelledBody: "تم إلغاء محاولة الدفع هذه.",
  retry: "بدء عملية دفع جديدة",
  goCourses: "الذهاب إلى دوراتي",
  viewPurchase: "عرض عملية الشراء",
  transaction: "معرّف المعاملة",
  updated: "آخر تحديث",
  expiresIn: "تنتهي صلاحية الدفع خلال",
  checking: "جارٍ التحقق من حالة الدفع...",
  refreshError: "تعذر تحديث حالة الدفع. ستتم إعادة المحاولة...",
  noExpiry: "أكمل التحويل ما دامت عملية الدفع فعالة لدى مزود الخدمة.",
  usdt: "USDT",
  couponAfter: "يتم التحقق من الخصومات وحسابها من خلال الخادم.",
  errors: {
    EMAIL_VERIFICATION_REQUIRED:
      "يرجى تأكيد بريدك الإلكتروني قبل إتمام الشراء.",
    ALREADY_OWNED: "أنت تملك هذه الدورة بالفعل.",
    INVALID_COURSE: "هذه الدورة غير متاحة.",
    INVALID_COUPON: "رمز الخصم غير صالح أو منتهي.",
    COUPON_NOT_ELIGIBLE: "رمز الخصم لا ينطبق على هذه الدورة.",
    COUPON_USAGE_LIMIT: "بلغ رمز الخصم الحد الأقصى للاستخدام.",
    COUPON_USER_LIMIT: "لقد بلغت الحد المسموح لاستخدام رمز الخصم هذا.",
    MINIMUM_ORDER_NOT_MET: "قيمة الطلب لا تحقق الحد الأدنى لهذا الخصم.",
    COUPON_CURRENCY_MISMATCH: "لا يمكن استخدام رمز الخصم مع هذه العملة.",
    ZERO_VALUE_CHECKOUT_UNSUPPORTED:
      "لا يمكن استخدام هذا الخصم مع عملية الدفع الحالية.",
    INVALID_INPUT: "تحقق من بيانات عملية الشراء وحاول مجدداً.",
    PAYMENT_UNAVAILABLE: "خدمة الدفع غير متاحة مؤقتاً.",
    CHECKOUT_CONFLICT: "تعذر إنشاء عملية الدفع. حاول مجدداً.",
    CSRF_REJECTED: "حدّث الصفحة وحاول مجدداً.",
    default: "تعذر إكمال طلب الدفع. حاول مجدداً.",
  },
};
export function checkoutCopy(locale: Locale) {
  return locale === "ar" ? ar : en;
}
export function checkoutError(locale: Locale, code?: string) {
  const copy = checkoutCopy(locale);
  return copy.errors[code as keyof typeof copy.errors] ?? copy.errors.default;
}
