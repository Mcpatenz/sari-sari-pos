export const FAQS = [
  {
    q: "Can I really sell ₱10 worth of cigarettes without creating a separate product?",
    a: "Yes. Each product keeps one inventory record in a base unit (sticks, pieces, grams or milliliters). Bundles and presets such as “3 pcs for ₱10” or “1 pack” are just selling options attached to that single record, so stock is always deducted by the true amount sold.",
  },
  {
    q: "How does the app work when the internet goes down?",
    a: "TindahanPOS is an offline-first Progressive Web App. Products and sales are stored on the device in IndexedDB, so you can keep selling with no connection. Each sale is queued and marked Pending Sync. When you reconnect, the queue is pushed to the central database and acknowledged.",
  },
  {
    q: "If my phone and laptop are both offline, will they match?",
    a: "Not immediately. Offline devices work independently until they reconnect. Once both reach the internet they sync through the central database. Duplicate sales are avoided with an idempotency key, and each transaction shows either Synced or Pending Sync.",
  },
  {
    q: "How is rice sold by the half kilo priced correctly?",
    a: "Weight products are stored internally in grams with a price per kilogram. The cashier can enter kilograms, tap ½ kg, or type an open price like ₱20, and the app converts the amount to grams and computes the exact price.",
  },
  {
    q: "Do I need to buy a printer or a weighing scale?",
    a: "No. You can start with on-screen receipts and manual weight entry, then add a Bluetooth thermal printer or a compatible digital scale later. The setup wizard records your choice so the cashier screen adapts.",
  },
  {
    q: "Will it run on the phone, tablet and computer I already own?",
    a: "Yes. It is one web application that installs to your home screen on Android, iOS, Windows and Mac. There is no separate APK or desktop installer to maintain.",
  },
];
