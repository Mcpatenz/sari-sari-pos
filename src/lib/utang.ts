export type UtangSale = {
  id: string;
  receiptNumber: string;
  totalCents: number;
  collectedCents: number;
  createdAt: string;
  collectedAt: string | null;
  customer: {
    id: string;
    customerId: string;
    name: string;
    photoUrl?: string | null;
  } | null;
  cashier: {
    id: string;
    name: string;
    employeeId: string | null;
  } | null;
  items: Array<{
    productName: string;
    quantityBase: number;
  }>;
};

export type UtangSummary = {
  totalCents: number;
  collectedCents: number;
  outstandingCents: number;
};
