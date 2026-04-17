# Walli Split — vägen till riktig app

> Sparad [idag]. Ta upp igen om ~1 vecka.

## TL;DR
Bygga Walli Split till en riktig lanserad app (iOS + Android + Swish Commerce)
= ~6 månader fritidsarbete + ~30 000 SEK engång + ~40 000 SEK/år löpande.

Break-even: ~5 000 aktiva användare, typiskt 12–18 månader.

---

## Stegen i korthet

### 1. Företagsform
- **Enskild firma** (gratis, Skatteverket) — starta här
- **AB** (25 000 SEK aktiekapital) — konvertera vid 50k+ SEK/år

### 2. Bank + Swish Handel (2–6 veckor)
- Företagskonto (SEB/Swedbank/Handelsbanken)
- Swish Företag (gratis)
- Swish Handel API: ~400 SEK/mån + 1,50–2,50 SEK/transaktion
- TLS-certifikat från banken
- Testa i MSS (Merchant Swish Simulator) först

### 3. Native app (2–3 månader)
- **Expo (React Native)** — samma kod iOS + Android
- **Supabase** — Postgres + auth + storage
- **RevenueCat** — IAP över båda plattformar
- Återanvänder ~70% av kod från walliprag.vercel.app/split

### 4. App Store publisering
- Apple Developer: 99 USD/år (~1 050 SEK)
- Google Play: 25 USD engång (~260 SEK)
- Privacy Policy + Terms (Termly.io)
- Apple tar 15–30% av IAP, Google samma

### 5. Infrastruktur
| Tjänst | SEK/mån |
|--------|---------|
| Supabase Pro | 250 |
| Vercel | 200 |
| Swish Handel | 400 |
| Apple Developer | 85 |
| **Drift total** | **~1 000 SEK/mån** |

---

## Total kostnad

**Engång:** ~30 000 SEK (AB) eller ~5 000 SEK (enskild firma)
**Löpande:** ~40 000 SEK/år inkl. marknadsföring

## Intäktsmodeller (inte suga)
1. **Freemium premium:** 29 SEK/mån eller 199 SEK/år (kvittoscanning, rapporter)
2. **Affiliate:** Revolut/Wise/Booking.com — 50 kr per konvertering
3. **Swish-transaktionsavgift:** 1 kr per settled payment
4. **B2B white-label:** 20k–100k SEK/kund/år

## Realistiska prognoser

**Pessimistiskt år 1:**
- 1 000 användare, 30 betalande
- -30 000 SEK netto

**Optimistiskt år 1 (viral):**
- 20 000 användare, 500 betalande
- +100 000 SEK netto

---

## Nisch-fördelar mot Splitwise
- **Swish-integration** (Splitwise saknar Norden)
- **Klarna/Revolut-integrationer** för FX på resor
- **Resor-first** design (aktiviteter, flyg, hotell i samma app)
- **Nordisk design** (minimalistiskt, inte amerikansk UI)

---

## TODO när vi plockar upp detta igen
- [ ] Avgöra: enskild firma eller AB direkt
- [ ] Kolla kontrakt hos nuvarande arbetsgivare (bisyssla)
- [ ] Registrera domän (walli.app / split.nu / walli-split.com)
- [ ] Bestäm första version: bara webb (som nu) eller native direkt?
- [ ] Om native: börja konvertera /split till React Native / Expo
- [ ] Om webb: fokusera på Swish deep links + onboarding-flöde
