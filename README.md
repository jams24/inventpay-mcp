# InventPay MCP Server

Give AI agents the ability to manage crypto payments, stores, products, and orders through the [Model Context Protocol](https://modelcontextprotocol.io).

## Installation

```bash
npm install -g inventpay-mcp
```

Or run directly with npx:

```bash
npx inventpay-mcp
```

## Configuration

### Get your API Keys

1. Sign up at [inventpay.io](https://inventpay.io)
2. Go to **Dashboard → Settings**
3. Copy your **API key** (`pk_live_...`) — used for all operations (payments, invoices, store, products, orders, balances)
4. *(Optional)* Generate a **Withdrawal API key** (`wk_live_...`) — used exclusively for withdrawing funds to external wallets

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "npx",
      "args": ["-y", "inventpay-mcp"],
      "env": {
        "INVENTPAY_API_KEY": "your-api-key-here",
        "INVENTPAY_WITHDRAWAL_KEY": "your-withdrawal-key-here"
      }
    }
  }
}
```

> `INVENTPAY_WITHDRAWAL_KEY` is optional. Without it, all tools work except `create_withdrawal`.

### Claude Code

```bash
claude mcp add inventpay -- npx -y inventpay-mcp
```

Then set the environment variables:

```bash
export INVENTPAY_API_KEY="your-api-key-here"
export INVENTPAY_WITHDRAWAL_KEY="your-withdrawal-key-here"  # Optional — only for withdrawals
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "npx",
      "args": ["-y", "inventpay-mcp"],
      "env": {
        "INVENTPAY_API_KEY": "your-api-key-here",
        "INVENTPAY_WITHDRAWAL_KEY": "your-withdrawal-key-here"
      }
    }
  }
}
```

> `INVENTPAY_WITHDRAWAL_KEY` is optional. Without it, all tools work except `create_withdrawal`.

### Windsurf

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "npx",
      "args": ["-y", "inventpay-mcp"],
      "env": {
        "INVENTPAY_API_KEY": "your-api-key-here",
        "INVENTPAY_WITHDRAWAL_KEY": "your-withdrawal-key-here"
      }
    }
  }
}
```

> `INVENTPAY_WITHDRAWAL_KEY` is optional. Without it, all tools work except `create_withdrawal`.

## Available Tools

### Payments

| Tool | Description |
|------|-------------|
| `create_payment` | Create a crypto payment with a unique wallet address |
| `create_invoice` | Create a multi-currency invoice (customer chooses crypto) |
| `get_payment_status` | Check payment status, confirmations, and transaction details |

### Balances

| Tool | Description |
|------|-------------|
| `get_balances` | Get all cryptocurrency balances (available, pending, earned, withdrawn) |

### Withdrawals

| Tool | Description |
|------|-------------|
| `create_withdrawal` | Withdraw funds to an external wallet address |
| `get_withdrawal` | Check withdrawal status and transaction hash |

### Store Management

| Tool | Description |
|------|-------------|
| `create_store` | Create a crypto-powered storefront |
| `get_store` | Get store details, product count, and order count |
| `update_store` | Update store name, description, logo, or visibility |

### Products

| Tool | Description |
|------|-------------|
| `create_product` | Add a digital product with automatic delivery content |
| `list_products` | List products with search and pagination |
| `update_product` | Update product details, price, or digital content |
| `delete_product` | Deactivate a product |

### Orders

| Tool | Description |
|------|-------------|
| `list_orders` | List orders with status filter and pagination |
| `get_order` | Get full order details (items, payment, customer) |
| `update_order_status` | Update fulfillment status |

### Analytics

| Tool | Description |
|------|-------------|
| `get_store_analytics` | Get order counts, revenue breakdown, and product stats |

## Example Prompts

Once connected, you can ask your AI agent things like:

- "Create a new store called 'Digital Downloads' and add a product for my e-book at $9.99"
- "Show me all my pending orders"
- "What's my current ETH balance?"
- "Create a payment for $50 in Bitcoin"
- "How much revenue has my store generated?"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INVENTPAY_API_KEY` | Yes | Your merchant API key (`pk_live_...`). Used for **all** operations: payments, invoices, store, products, orders, balances. |
| `INVENTPAY_WITHDRAWAL_KEY` | No | Withdrawal-only key (`wk_live_...`). Used **exclusively** for withdrawing funds to external wallets. Cannot be used for any other operation. Generate from **Dashboard → Settings → Withdrawal API Key**. |
| `INVENTPAY_BASE_URL` | No | API base URL (default: `https://api.inventpay.io`) |

## License

MIT
