// The server recomputes every line price from the product record, so the push
// payload only carries what it needs to trust: which product and how much.
export type SalePushItem = {
  productId: string;
  quantityBase: number;
};

export type SalePushPayload = {
  idempotencyKey: string;
  deviceId?: string;
  cashReceivedCents: number;
  discountCents?: number;
  paymentMethod?: "CASH" | "GCASH" | "UTANG";
  customerId?: string;
  note?: string;
  referenceNumber?: string;
  items: SalePushItem[];
};

export type ServerSale = {
  id: string;
  receiptNumber: string;
  totalCents: number;
  changeCents: number;
  createdAt: string;
};

/** Error that carries the HTTP status so sync logic can tell transient from terminal. */
export class SaleSyncError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SaleSyncError";
    this.status = status;
  }
}

export type SaleVoidAction = "VOID" | "RETURN";

export async function voidSale(input: {
  saleId: string;
  action: SaleVoidAction;
  note?: string;
}): Promise<{ id: string; status: "VOIDED" | "RETURNED" }> {
  let response: Response;
  try {
    response = await fetch("/api/sales/void", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    throw new SaleSyncError("Network unavailable.", 0);
  }

  const data = (await response.json().catch(() => ({}))) as {
    sale?: { id: string; status: "VOIDED" | "RETURNED" };
    error?: string;
  };

  if (!response.ok || !data.sale) {
    throw new SaleSyncError(
      data.error || `Could not complete the request (${response.status}).`,
      response.status,
    );
  }

  return data.sale;
}

export async function pushSale(payload: SalePushPayload): Promise<ServerSale> {
  let response: Response;
  try {
    response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    throw new SaleSyncError("Network unavailable.", 0);
  }

  const data = (await response.json().catch(() => ({}))) as {
    sale?: ServerSale;
    error?: string;
  };

  if (!response.ok || !data.sale) {
    throw new SaleSyncError(
      data.error || `Sync failed (${response.status}).`,
      response.status,
    );
  }

  return data.sale;
}
