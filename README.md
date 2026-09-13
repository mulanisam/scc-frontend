# Sohel Chicken Centre — frontend

React app for a poultry trading business: bulk and single sale entry, purchase
entry, the customer and trading ledgers, master data, and a messaging dashboard
for WhatsApp/SMS delivery status.

React 18, MUI 5, Create React App. Talks to the [backend](../scc-backend) over
its REST API.

## Running it

```bash
npm install
npm start          # dev server, http://localhost:3000
```

The API address is derived from wherever the page itself was loaded from
(`src/config/axiosConfig.js`) — open it as `localhost:3000` and it calls
`localhost:8080`; open it from another device on the same network at the
machine's LAN address and it calls the backend at that same address, no
configuration needed. Set `REACT_APP_API_URL` at build time to override this
outright, which is what a real domain in production needs.

## Building for something other than a laptop dev server

```bash
npm run build
npx serve -s build -l 3000
```

`npm start` is the development server - hot reload, an error overlay, a heavier
memory footprint - built for one person actively editing code. It is not what
should be left running all day for several people on a shop network to use.

## `mac-launcher/`

Double-click `Start SCC.command` / `Stop SCC.command` to start or stop this
app and the backend together on the shop Mac, without three Terminal windows
to manage by hand. See `mac-launcher/README.txt` for the one thing that needs
telling to the backend before a phone on the same wifi can reach it, and
`../scc-backend/docs/running-the-stack.md` for the fuller picture -
process supervision, and what changes when this moves to the cloud.

## Tests

```bash
npm test
```
