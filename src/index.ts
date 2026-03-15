#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

const API_KEY = process.env.INVENTPAY_API_KEY;
const WITHDRAWAL_API_KEY = process.env.INVENTPAY_WITHDRAWAL_KEY;
const BASE_URL =
  process.env.INVENTPAY_BASE_URL || "https://api.inventpay.io";

if (!API_KEY) {
  console.error(
    "WARNING: INVENTPAY_API_KEY environment variable is not set. All API calls will fail."
  );
}

// ============================================================================
// HTTP Client
// ============================================================================

async function callApi(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  if (!API_KEY) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error:
                "INVENTPAY_API_KEY is not configured. Set it as an environment variable.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    const headers: Record<string, string> = {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...extraHeaders,
    };

    const options: RequestInit = { method, headers };
    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: false, error: `Request failed: ${message}` },
            null,
            2
          ),
        },
      ],
    };
  }
}

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
  );
}

// ============================================================================
// Reusable Schemas
// ============================================================================

const digitalContentSchema = z
  .object({
    fileUrl: z.string().optional().describe("Download URL for the digital file"),
    fileName: z.string().optional().describe("Display name for the file"),
    fileSize: z.number().optional().describe("File size in bytes"),
    licenseKey: z
      .string()
      .optional()
      .describe("License or activation key"),
    instructions: z
      .string()
      .optional()
      .describe("Setup or access instructions for the customer"),
    textContent: z
      .string()
      .optional()
      .describe("Inline text content delivered directly to the customer"),
  })
  .optional()
  .describe("Digital delivery content — auto-delivered after payment");

// ============================================================================
// Server Setup
// ============================================================================

const server = new McpServer({
  name: "inventpay",
  version: "1.0.0",
});

// ============================================================================
// PAYMENT TOOLS
// ============================================================================

server.tool(
  "create_payment",
  "Create a crypto payment. Returns a unique wallet address, QR code, and invoice URL for the customer to pay.",
  {
    amount: z.number().describe("Payment amount"),
    amountCurrency: z
      .enum(["USD", "USDT", "BTC", "LTC", "ETH"])
      .default("USDT")
      .describe("Currency the amount is denominated in"),
    currency: z
      .enum(["BTC", "ETH", "LTC", "USDT_ERC20", "USDT_BEP20"])
      .describe("Cryptocurrency the customer will pay with"),
    orderId: z
      .string()
      .optional()
      .describe("Your internal order/reference ID"),
    description: z
      .string()
      .optional()
      .describe("Payment description shown to the customer"),
    callbackUrl: z
      .string()
      .optional()
      .describe("Webhook URL for payment status notifications"),
    expirationMinutes: z
      .number()
      .optional()
      .describe("Payment expiration in minutes (5-1440, default 30)"),
  },
  async (params) => callApi("POST", "/v1/create_payment", params)
);

server.tool(
  "create_invoice",
  "Create a multi-currency invoice. The customer can choose which cryptocurrency to pay with. Returns an invoice URL.",
  {
    amount: z.number().describe("Invoice amount"),
    amountCurrency: z
      .enum(["USD", "USDT", "BTC", "LTC", "ETH"])
      .default("USDT")
      .describe("Currency the amount is denominated in"),
    orderId: z
      .string()
      .optional()
      .describe("Your internal order/reference ID"),
    description: z
      .string()
      .optional()
      .describe("Invoice description"),
    callbackUrl: z
      .string()
      .optional()
      .describe("Webhook URL for payment status notifications"),
    expirationMinutes: z
      .number()
      .optional()
      .describe("Invoice expiration in minutes (5-1440, default 60)"),
  },
  async (params) => callApi("POST", "/v1/create_invoice", params)
);

server.tool(
  "get_payment_status",
  "Check the current status of a payment or invoice. Returns status, amount, confirmations, and transaction details.",
  {
    paymentId: z.string().describe("The payment or invoice ID"),
  },
  async ({ paymentId }) =>
    callApi("GET", `/v1/invoice/${encodeURIComponent(paymentId)}/status`)
);

// ============================================================================
// BALANCE TOOLS
// ============================================================================

server.tool(
  "get_balances",
  "Get all cryptocurrency balances for your merchant account. Shows available, pending, total earned, and total withdrawn for each currency.",
  {},
  async () => callApi("GET", "/v1/balance")
);

// ============================================================================
// WITHDRAWAL TOOLS
// ============================================================================

server.tool(
  "create_withdrawal",
  "Create a withdrawal request to send funds to an external wallet address. Requires INVENTPAY_WITHDRAWAL_KEY to be configured (a separate withdrawal API key generated from Dashboard → Settings).",
  {
    amount: z.number().describe("Amount to withdraw"),
    currency: z
      .enum(["BTC", "ETH", "LTC", "USDT_ERC20", "USDT_BEP20"])
      .describe("Cryptocurrency to withdraw"),
    destinationAddress: z
      .string()
      .describe("External wallet address to send funds to"),
    description: z
      .string()
      .optional()
      .describe("Withdrawal description/memo"),
  },
  async (params) => {
    if (!WITHDRAWAL_API_KEY) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error:
                  "INVENTPAY_WITHDRAWAL_KEY is not configured. Generate a withdrawal API key from Dashboard → Settings → Withdrawal API Key, then set it as the INVENTPAY_WITHDRAWAL_KEY environment variable.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
    return callApi("POST", "/v1/merchant/withdrawal/create", params, {
      "X-Withdrawal-Key": WITHDRAWAL_API_KEY,
    });
  }
);

server.tool(
  "get_withdrawal",
  "Check the status of a withdrawal request. Returns status, amount, transaction hash, and processing details.",
  {
    withdrawalId: z.string().describe("The withdrawal ID"),
  },
  async ({ withdrawalId }) =>
    callApi(
      "GET",
      `/v1/withdrawal/${encodeURIComponent(withdrawalId)}`
    )
);

// ============================================================================
// STORE MANAGEMENT TOOLS
// ============================================================================

server.tool(
  "create_store",
  "Create a new merchant storefront. Each merchant gets one store with a unique URL slug. Customers can browse and purchase digital products with crypto.",
  {
    name: z
      .string()
      .describe("Store name (2-100 characters). A URL slug will be auto-generated."),
    description: z
      .string()
      .optional()
      .describe("Store description (max 1000 characters)"),
    logo: z.string().optional().describe("HTTPS URL for the store logo"),
    banner: z
      .string()
      .optional()
      .describe("HTTPS URL for the store banner image"),
    settings: z
      .record(z.unknown())
      .optional()
      .describe("Custom store settings"),
  },
  async (params) => callApi("POST", "/v1/store/manage", params)
);

server.tool(
  "get_store",
  "Get your store details including name, slug, URL, product count, and order count.",
  {},
  async () => callApi("GET", "/v1/store/manage")
);

server.tool(
  "update_store",
  "Update your store details. Only provided fields are changed.",
  {
    name: z.string().optional().describe("Store name (2-100 characters)"),
    description: z
      .string()
      .optional()
      .describe("Store description (max 1000 characters)"),
    logo: z.string().optional().describe("HTTPS URL for the store logo"),
    banner: z
      .string()
      .optional()
      .describe("HTTPS URL for the store banner image"),
    isActive: z
      .boolean()
      .optional()
      .describe("Toggle store visibility (true = live, false = hidden)"),
    settings: z
      .record(z.unknown())
      .optional()
      .describe("Custom store settings"),
  },
  async (params) => callApi("PUT", "/v1/store/manage", params)
);

// ============================================================================
// Product URL Helper
// ============================================================================

async function enrichProductUrls(
  result: { content: Array<{ type: "text"; text: string }> }
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const storeResult = await callApi("GET", "/v1/store/manage");
    const storeData = JSON.parse(storeResult.content[0].text);
    if (!storeData.success) return result;

    const storeSlug = storeData.data?.slug;
    if (!storeSlug) return result;

    const data = JSON.parse(result.content[0].text);
    if (!data.success) return result;

    // Single product (create/update)
    if (data.data?.slug) {
      data.data.productUrl = `https://inventpay.io/store/${storeSlug}/product/${data.data.slug}`;
    }

    // Product list
    if (Array.isArray(data.data?.products)) {
      for (const product of data.data.products) {
        if (product.slug) {
          product.productUrl = `https://inventpay.io/store/${storeSlug}/product/${product.slug}`;
        }
      }
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  } catch {
    return result;
  }
}

// ============================================================================
// PRODUCT TOOLS
// ============================================================================

server.tool(
  "create_product",
  "Add a digital product to your store. Products are priced in USDT and auto-converted to crypto at checkout. Attach digitalContent for automatic delivery after payment.",
  {
    name: z.string().describe("Product name (1-200 characters)"),
    price: z.number().describe("Price in USDT (0.01 - 1,000,000)"),
    description: z
      .string()
      .optional()
      .describe("Product description (max 5000 characters)"),
    images: z
      .array(z.string())
      .optional()
      .describe("Array of HTTPS image URLs (max 10)"),
    stock: z
      .number()
      .optional()
      .describe("Available quantity. Omit for unlimited stock."),
    variants: z
      .array(z.unknown())
      .optional()
      .describe("Variant options (e.g., size, tier)"),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe("Custom key-value metadata"),
    digitalContent: digitalContentSchema,
  },
  async (params) => enrichProductUrls(await callApi("POST", "/v1/store/manage/products", params))
);

server.tool(
  "list_products",
  "List all products in your store with optional search and pagination.",
  {
    page: z.number().optional().describe("Page number (default 1)"),
    limit: z
      .number()
      .optional()
      .describe("Items per page, 1-50 (default 20)"),
    search: z
      .string()
      .optional()
      .describe("Search products by name"),
  },
  async (params) =>
    enrichProductUrls(await callApi("GET", `/v1/store/manage/products${buildQuery(params)}`))
);

server.tool(
  "update_product",
  "Update a product in your store. Only provided fields are changed. Updating the name regenerates the slug.",
  {
    id: z.string().describe("Product ID"),
    name: z.string().optional().describe("Product name (1-200 characters)"),
    price: z
      .number()
      .optional()
      .describe("Price in USDT (0.01 - 1,000,000)"),
    description: z
      .string()
      .optional()
      .describe("Product description (max 5000 characters)"),
    images: z
      .array(z.string())
      .optional()
      .describe("Array of HTTPS image URLs (max 10)"),
    stock: z
      .number()
      .optional()
      .describe("Available quantity (0-999,999)"),
    isActive: z
      .boolean()
      .optional()
      .describe("Toggle product visibility"),
    sortOrder: z
      .number()
      .optional()
      .describe("Display order (0-9999)"),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe("Custom key-value metadata"),
    digitalContent: digitalContentSchema,
  },
  async ({ id, ...body }) =>
    enrichProductUrls(await callApi("PUT", `/v1/store/manage/products/${encodeURIComponent(id)}`, body))
);

server.tool(
  "delete_product",
  "Deactivate a product from your store. Products with existing orders are soft-deleted (hidden, not removed).",
  {
    id: z.string().describe("Product ID to deactivate"),
  },
  async ({ id }) =>
    callApi("DELETE", `/v1/store/manage/products/${encodeURIComponent(id)}`)
);

// ============================================================================
// KEY POOL TOOLS
// ============================================================================

server.tool(
  "add_product_keys",
  "Upload unique keys/codes to a product's key pool. Each customer gets one unique key on purchase (FIFO). Use this for license keys, activation codes, gift cards, etc.",
  {
    productId: z.string().describe("Product ID"),
    keys: z
      .array(z.string())
      .describe("Array of unique keys/codes to add (max 10,000 per request)"),
    label: z
      .string()
      .optional()
      .describe("Optional batch label (e.g. 'Batch #1', 'Premium Keys')"),
  },
  async ({ productId, ...body }) =>
    callApi(
      "POST",
      `/v1/store/manage/products/${encodeURIComponent(productId)}/keys`,
      body
    )
);

server.tool(
  "list_product_keys",
  "List keys in a product's key pool with status filter and pagination.",
  {
    productId: z.string().describe("Product ID"),
    page: z.number().optional().describe("Page number (default 1)"),
    limit: z.number().optional().describe("Items per page, 1-100 (default 50)"),
    status: z
      .enum(["AVAILABLE", "ASSIGNED", "REVOKED"])
      .optional()
      .describe("Filter by key status"),
  },
  async ({ productId, ...params }) =>
    callApi(
      "GET",
      `/v1/store/manage/products/${encodeURIComponent(productId)}/keys${buildQuery(params)}`
    )
);

server.tool(
  "get_key_pool_stats",
  "Get key pool statistics for a product: available, assigned, revoked, and total counts.",
  {
    productId: z.string().describe("Product ID"),
  },
  async ({ productId }) =>
    callApi(
      "GET",
      `/v1/store/manage/products/${encodeURIComponent(productId)}/keys/stats`
    )
);

// ============================================================================
// ORDER TOOLS
// ============================================================================

server.tool(
  "list_orders",
  "List all orders for your store with optional status filter and pagination.",
  {
    page: z.number().optional().describe("Page number (default 1)"),
    limit: z
      .number()
      .optional()
      .describe("Items per page, 1-50 (default 20)"),
    status: z
      .enum([
        "PENDING",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ])
      .optional()
      .describe("Filter by order status"),
  },
  async (params) =>
    callApi("GET", `/v1/store/manage/orders${buildQuery(params)}`)
);

server.tool(
  "get_order",
  "Get full details of a specific order including items, payment status, customer info, and timestamps.",
  {
    id: z.string().describe("Order ID"),
  },
  async ({ id }) =>
    callApi("GET", `/v1/store/manage/orders/${encodeURIComponent(id)}`)
);

server.tool(
  "update_order_status",
  "Update the fulfillment status of an order. Valid transitions: PAID→PROCESSING, PROCESSING→SHIPPED/COMPLETED, SHIPPED→COMPLETED, COMPLETED→REFUNDED. Digital orders auto-transition to COMPLETED.",
  {
    id: z.string().describe("Order ID"),
    status: z
      .enum([
        "PROCESSING",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ])
      .describe("New order status"),
    notes: z
      .string()
      .optional()
      .describe("Optional notes about this status change"),
  },
  async ({ id, ...body }) =>
    callApi(
      "PUT",
      `/v1/store/manage/orders/${encodeURIComponent(id)}/status`,
      body
    )
);

// ============================================================================
// ANALYTICS TOOL
// ============================================================================

server.tool(
  "get_store_analytics",
  "Get store analytics: total orders, revenue breakdown by status, product count, and recent order activity.",
  {},
  async () => {
    if (!API_KEY) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: "INVENTPAY_API_KEY is not configured.",
            }),
          },
        ],
      };
    }

    try {
      const headers: Record<string, string> = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      };

      // Fetch store info and orders in parallel
      const [storeRes, ordersRes] = await Promise.all([
        fetch(`${BASE_URL}/v1/store/manage`, { headers }),
        fetch(`${BASE_URL}/v1/store/manage/orders?limit=50`, { headers }),
      ]);

      const storeData = await storeRes.json();
      const ordersData = await ordersRes.json();

      if (!storeData.success) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(storeData, null, 2) },
          ],
        };
      }

      // Compute analytics from orders
      const orders = ordersData.data?.orders || [];
      const statusCounts: Record<string, number> = {};
      let totalRevenue = 0;
      let paidRevenue = 0;

      for (const order of orders) {
        const status = order.status || "UNKNOWN";
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        const amount = parseFloat(order.total || "0");
        totalRevenue += amount;
        if (
          status === "PAID" ||
          status === "COMPLETED" ||
          status === "PROCESSING" ||
          status === "SHIPPED"
        ) {
          paidRevenue += amount;
        }
      }

      const analytics = {
        success: true,
        data: {
          store: {
            name: storeData.data?.name,
            slug: storeData.data?.slug,
            isActive: storeData.data?.isActive,
            url: `https://inventpay.io/store/${storeData.data?.slug}`,
          },
          orders: {
            total: ordersData.data?.pagination?.total || orders.length,
            byStatus: statusCounts,
            recentCount: orders.length,
          },
          revenue: {
            totalUSDT: totalRevenue.toFixed(2),
            confirmedUSDT: paidRevenue.toFixed(2),
            currency: "USDT",
          },
          products: {
            total: storeData.data?._count?.products || null,
          },
        },
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(analytics, null, 2) },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Analytics failed: ${message}`,
            }),
          },
        ],
      };
    }
  }
);

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InventPay MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
