# Pramanik — प्रमाणिक
Verified open marketplace. Community trust. No middlemen.

![Stellar](https://img.shields.io/badge/Stellar-Lurquoise?style=for-the-badge&logo=stellar&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban-Purple?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Pramanik is an open, verified marketplace designed for global suppliers to list products and build trust through community verification. It removes the need for expensive middlemen by using blockchain-enforced escrow and decentralized governance.

## Where This Started — Soul-Society

Before Pramanik, I built **Soul-Society**, a blockchain-based charity donation platform on Stellar. The goal was to solve the massive problem of charity fraud, where donors often have no way to verify if their money actually reached the intended cause.

In Soul-Society, NGOs would upload proof-of-work (photos/videos) to IPFS, and the community would vote on its authenticity. If verified, 50% of the donation locked in a Soroban escrow would be released; otherwise, it was refunded after 30 days. I built 7 Soroban smart contracts (escrow, token, badge, registry, vault, treasury, notifications), a full Next.js frontend with Redux, and an Express backend. It passed 38 Jest tests and 54 Cargo tests, reaching Level 4 of the Stellar Journey to Mastery hackathon.

It worked technically. But it had problems.

## Why the Original Idea Wasn't Enough

As I look back at Soul-Society, I realized that while the code was solid, the execution wasn't grounded in reality.

### The users couldn't use it
The people who needed this most—small NGOs and donors—found it impossible to navigate. Expecting them to manage private keys and understand Soroban contracts was a developer's dream, not a user's reality. I was solving for the technology, not for the people.

### It was still centralized
This was the hardest realization. Even with smart contracts, I was the one deciding which NGOs got listed. If I was corrupt or biased, the whole system collapsed. It wasn't decentralization; it was just a standard website with extra blockchain steps. One person still held the keys to the gate.

### The proof didn't prove anything
A community member in one city can't truly know if a school was built in a remote village just by looking at a photo. Staged photos and coordinated fake voting are too easy to game. Without physical ground truth, the "verification" was just guesswork.

## The Same Problem in a Better Place

I realized the trust problem Soul-Society tried to solve is even more acute in global commerce.

Consider a spice farmer. He's been growing organic turmeric for 30 years, but when he tries to sell to an international buyer, they don't trust him. So they use a broker who takes a 15-25% commission just to vouch for him. The farmer loses profit, the buyer overpays, and the broker adds zero actual value beyond a connection.

This is the same trust problem. But it is bigger, more frequent, and the proof is something a buyer can actually check—the product either arrives as described, or it doesn't. In commerce, both sides have financial skin in the game, and the scale makes decentralized verification actually worth building.

## What Pramanik Does Differently

Pramanik removes the middlemen and returns the power to the community and the code.

**No central gatekeeper:** Unlike Soul-Society, no admin decides who gets in. Any supplier can list, and the 60% community threshold is enforced strictly by code. No human can override the verification.

**WhatsApp-native:** Suppliers and small exporters already use messaging apps for business. Pramanik meets them there. An NVIDIA NIM-powered bot (Llama 3.1) handles listings and updates in any language, so there’s no new app to learn.

**USDC escrow:** Payments are handled via Stellar. Whether you pay in XLM, BTC, or local currency via UPI, the Stellar DEX converts it to USDC, which is locked in a Soroban escrow until delivery is confirmed.

### The Flow:
```
Supplier lists via messaging → uploads proof photos
Community votes: real or fake? → 60% threshold auto-verifies (no admin)
Buyer pays: XLM / BTC / ETH / Local Currency
Stellar DEX converts → USDC locked in Soroban escrow
Supplier ships → sends messaging stage updates
Buyer confirms delivery → escrow releases USDC to supplier
No broker. No middleman. No override.
```

## What Soul-Society Got Wrong (and What Changed)

In Soul-Society, I tried to use Stellar as a database—storing every post and vote on-chain. It was slow and didn't scale. Pramanik fixes the architecture by separating concerns: data belongs in a fast, queryable database; payments and immutable receipts belong on the blockchain.

```
PostgreSQL (Prisma)  ←  all data: users, products, votes, orders
Stellar blockchain   ←  payments + escrow + immutable TX receipts only
```

This change makes the system fast, searchable, and cost-effective while keeping the core trust layer decentralized.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, Redux Toolkit, Tailwind CSS |
| Backend | Express.js 5, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Blockchain | Stellar, Soroban smart contracts (Rust) |
| AI | NVIDIA NIM — llama-3.1-8b-instruct |
| Messaging | Twilio WhatsApp Business API |
| Storage | Pinata IPFS |

## Why Stellar

- **Minimal Fees:** Tracking 10 product stages per order costs a fraction of a cent, making it viable for even small-scale commerce.
- **Built-in DEX:** Any Stellar asset converts to USDC automatically without needing external bridges or complicated swaps.
- **Soroban:** Real smart contracts allow us to bake dispute logic and escrow directly into the network.

## Quick Start

```bash
make setup    # install deps, copy .env files
              # fill in server/.env with your API keys
make migrate  # create PostgreSQL tables
make dev      # start postgres + server + frontend
```

## License

MIT
