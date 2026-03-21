---
name: inventpay
description: Accept crypto payments, manage a digital storefront, track balances, and process withdrawals — all through your agent
version: 1.0.1
author: jams24
homepage: https://inventpay.io
source: https://github.com/jams24/inventpay-mcp
license: MIT-0
tags:
  - payments
  - crypto
  - store
  - ecommerce
  - bitcoin
  - usdt
  - invoicing
  - withdrawals
  - digital-products
  - monetization
metadata: {"openclaw":{"requires":{"env":["INVENTPAY_API_KEY"],"bins":["npx"]},"primaryEnv":"INVENTPAY_API_KEY","emoji":"💰"}}
---

# InventPay Skill

Give your OpenClaw agent the ability to accept crypto payments, run a digital store, and manage funds.

## What this skill does

This skill connects your agent to [InventPay](https://inventpay.io)'s payment infrastructure through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It uses the open-source [`inventpay-mcp`](https://github.com/jams24/inventpay-mcp) server (MIT license, [source on GitHub](https://github.com/jams24/inventpay-mcp), [npm package](https://www.npmjs.com/package/inventpay-mcp)).

Your agent gets real tools that let it:

- Create crypto payment links and invoices (BTC, ETH, LTC, USDT)
- Run a full digital storefront with automatic product delivery
- Check balances across all currencies
- Track orders and view store analytics
- Process withdrawals to external wallets (optional, requires separate key)

Everything runs through InventPay's API. Payments settle on-chain. Delivery is automatic for digital products.

## Quick start

### Install

```bash
openclaw install inventpay
```

Or add it manually by placing this skill folder in your OpenClaw skills directory.

The skill uses the [`inventpay-mcp`](https://github.com/jams24/inventpay-mcp) server (v1.0.2). You can install it explicitly to avoid runtime fetching:

```bash
npm install -g inventpay-mcp@1.0.2
```

Or if you prefer npx (fetches at runtime):

```bash
npx inventpay-mcp@1.0.2
```

### Configure

1. Sign up at [inventpay.io](https://inventpay.io) and go to **Dashboard > Settings**
2. Copy your API key (`pk_live_...`)
3. Set the environment variable:

```bash
export INVENTPAY_API_KEY="pk_live_your_key_here"
```

For OpenClaw's config file, add the MCP server:

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "npx",
      "args": ["inventpay-mcp@1.0.2"],
      "env": {
        "INVENTPAY_API_KEY": "${INVENTPAY_API_KEY}"
      }
    }
  }
}
```

> **Note:** The `-y` flag is intentionally omitted. npx will prompt you to confirm before downloading the package. This is safer — you get a chance to verify the package name and version before anything executes.

> **Note:** The withdrawal key is NOT included in the default config. See the [Security section](#security) below before enabling withdrawals.

### Verify

Ask your agent:

> "What's my InventPay balance?"

If configured correctly, the agent will call the `get_balances` tool and return your current balances across all currencies. If you see an auth error, double check that your `INVENTPAY_API_KEY` is set and starts with `pk_live_`.

## Available tools

### Payments

| Tool | What it does |
|------|-------------|
| `create_payment` | Create a crypto payment with a specific currency and wallet address |
| `create_invoice` | Create a multi-currency invoice — the buyer picks which crypto to pay with |
| `get_payment_status` | Check if a payment went through, how many confirmations, transaction hash |

### Store

| Tool | What it does |
|------|-------------|
| `create_store` | Set up a digital storefront with a public URL |
| `get_store` | Get your store details, product count, order count |
| `update_store` | Change store name, description, logo, accepted currencies |

### Products

| Tool | What it does |
|------|-------------|
| `create_product` | Add a digital product with price and delivery content |
| `list_products` | Browse your products with search and pagination |
| `update_product` | Edit product details, pricing, or delivery content |
| `delete_product` | Deactivate or remove a product |

### Orders

| Tool | What it does |
|------|-------------|
| `list_orders` | View orders filtered by status |
| `get_order` | Full order details — items, payment info, customer email |
| `update_order_status` | Mark orders as processing, shipped, completed, etc. |

### Balances & Analytics

| Tool | What it does |
|------|-------------|
| `get_balances` | See available, pending, earned, and withdrawn amounts per currency |
| `get_store_analytics` | Revenue breakdown, order counts, top products |

### Withdrawals (requires separate key)

| Tool | What it does |
|------|-------------|
| `create_withdrawal` | Send funds to an external wallet (**requires INVENTPAY_WITHDRAWAL_KEY**) |
| `get_withdrawal` | Check withdrawal status and transaction hash |

## How to use this skill

Here are things you can tell your agent once this skill is installed.

**Accepting payments:**

> "Create a $50 USDT payment for the consulting session with Alex"

> "Generate an invoice for $200 — let the client pick their preferred crypto"

> "Did payment abc123 go through yet?"

**Running a store:**

> "Create a store called 'AI Skill Shop'"

> "Add a product called 'Advanced Code Review Skill' priced at $8 with a download URL of https://example.com/my-skill.md"

> "Show me all my pending orders"

> "What's my store revenue this month?"

**Managing funds:**

> "What's my current balance across all currencies?"

> "Check the status of my last withdrawal"

## Selling OpenClaw skills through your store

This is a practical setup for monetizing premium skill files:

1. **Create your store** — your agent can do this in one message
2. **Add skill files as products** — set a price and provide a hosted download URL for the file (e.g. a GitHub release, S3 link, or any file hosting service)
3. **Share your store link** — it'll be `inventpay.io/store/your-slug`
4. **Buyers pay with crypto** — BTC, ETH, LTC, or USDT
5. **Delivery is automatic** — buyer pays, gets the download link immediately
6. **Withdraw earnings** — send to your wallet whenever you want

Your agent can manage the entire lifecycle: adding products, checking orders, answering balance questions.

### What sells well

- Industry-specific skills (legal workflows, financial analysis, medical documentation)
- Complex automation skills that chain multiple tools
- Curated skill bundles for specific roles or tasks
- Premium versions of popular free skills
- Integration skills for specific APIs or services

### Pricing

Most skill files sell between $3-15. The sweet spot is $5-10 for skills that save 30+ minutes of repeated work. Bundles of 5-10 related skills can go for $20-40.

### Important: what NOT to use as product content

- Do not paste API keys, passwords, or credentials into product descriptions or delivery content
- Do not paste private or unpublished skill manifests that contain secrets
- Use hosted file URLs for delivery instead of inline content when the file contains anything sensitive
- Product delivery content is stored on InventPay's servers — treat it like any other cloud storage

## Security

### API key scoping

InventPay uses two separate keys with different permissions:

| Key | Prefix | What it can do | What it cannot do |
|-----|--------|---------------|-------------------|
| **API Key** | `pk_live_` | Payments, invoices, store, products, orders, balances, analytics | Withdrawals |
| **Withdrawal Key** | `wk_live_` | Withdrawals only | Everything else |

The keys are intentionally separated. The API key alone cannot move money out of your account.

### Withdrawal key — read this before enabling

The `INVENTPAY_WITHDRAWAL_KEY` grants the ability to send funds to external wallets. Before adding it:

- **Only set it if you actually need automated withdrawals.** Most users don't — you can withdraw manually from the dashboard at [inventpay.io](https://inventpay.io).
- **The agent can initiate withdrawals autonomously** if this key is provided and the agent decides to call the tool. Make sure you understand this before enabling.
- **Generate a dedicated withdrawal key** from Dashboard > Settings > Withdrawal API Key. Do not reuse keys across services.
- **You can revoke the withdrawal key** at any time from the dashboard without affecting your API key or other operations.

To enable withdrawals, add the key to your OpenClaw MCP config:

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "npx",
      "args": ["inventpay-mcp@1.0.2"],
      "env": {
        "INVENTPAY_API_KEY": "${INVENTPAY_API_KEY}",
        "INVENTPAY_WITHDRAWAL_KEY": "${INVENTPAY_WITHDRAWAL_KEY}"
      }
    }
  }
}
```

### Package provenance

The MCP server package [`inventpay-mcp`](https://www.npmjs.com/package/inventpay-mcp) is:

- **Open source:** [github.com/jams24/inventpay-mcp](https://github.com/jams24/inventpay-mcp) (MIT license)
- **Published on npm:** [npmjs.com/package/inventpay-mcp](https://www.npmjs.com/package/inventpay-mcp)
- **Pinned in this skill to v1.0.2** — the version is explicit in the config to prevent unexpected updates
- **No post-install scripts** — the package contains only compiled TypeScript (dist/)
- **Two runtime dependencies:** `@modelcontextprotocol/sdk` and `zod` (input validation)

You can audit the package before running:

```bash
npm pack inventpay-mcp@1.0.2 && tar -xzf inventpay-mcp-1.0.2.tgz && ls package/
```

Or install globally to skip runtime npx fetching entirely:

```bash
npm install -g inventpay-mcp@1.0.2
```

Then use the global binary in your config:

```json
{
  "mcpServers": {
    "inventpay": {
      "command": "inventpay-mcp",
      "env": {
        "INVENTPAY_API_KEY": "${INVENTPAY_API_KEY}"
      }
    }
  }
}
```

## Supported currencies

| Currency | Network |
|----------|---------|
| BTC | Bitcoin |
| ETH | Ethereum |
| LTC | Litecoin |
| USDT | ERC-20 (Ethereum) |
| USDT | BEP-20 (BSC) |

Amount currencies for invoices: USD, USDT, BTC, ETH, LTC.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INVENTPAY_API_KEY` | **Yes** | Merchant API key (`pk_live_...`). Used for payments, store, products, orders, balances. Cannot initiate withdrawals. |
| `INVENTPAY_WITHDRAWAL_KEY` | No | Withdrawal key (`wk_live_...`). Only needed for `create_withdrawal`. See [Security section](#security) before enabling. |
| `INVENTPAY_BASE_URL` | No | API base URL. Defaults to `https://api.inventpay.io`. |

## Links

- **Source code:** [github.com/jams24/inventpay-mcp](https://github.com/jams24/inventpay-mcp)
- **npm package:** [npmjs.com/package/inventpay-mcp](https://www.npmjs.com/package/inventpay-mcp)
- **Dashboard:** [inventpay.io](https://inventpay.io)
- **API Docs:** [docs.inventpay.io](https://docs.inventpay.io)
- **JavaScript SDK:** [npmjs.com/package/inventpay](https://www.npmjs.com/package/inventpay)
- **Python SDK:** [pypi.org/project/inventpay](https://pypi.org/project/inventpay)

## Publisher

**InventPay** — Crypto payment infrastructure for developers and AI agents.

- Website: [inventpay.io](https://inventpay.io)
- GitHub: [github.com/jams24](https://github.com/jams24)
- npm: [npmjs.com/~jams24](https://www.npmjs.com/~jams24)
- Support: Available through the InventPay dashboard
