# Deployment, Environment Configuration & CI/CD
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/19-deployment.md`**

---

## 1. Environment Variables Configuration

The frontend consumes public environment variables defined in `.env`:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Real-Time Socket.IO Server URL
VITE_SOCKET_URL=http://localhost:5000

# Application Branding
VITE_APP_NAME=BookMyShow

# Public Razorpay Key ID (Public Key only; NEVER put secrets here)
VITE_RAZORPAY_KEY_ID=rzp_test_bookmyshow1234
```

---

## 2. Production Build Execution

To generate optimized production static assets:
```bash
cd apps/customer-frontend
npm run build
```
Vite bundles assets into `apps/customer-frontend/dist/`:
- `dist/index.html`
- `dist/assets/*.js` (Gzip-optimized feature chunks)
- `dist/assets/*.css` (Purged Tailwind CSS stylesheet)

---

## 3. Serving Options

1. **Docker / Nginx**: The compiled `dist/` directory can be mounted into standard Nginx Alpine containers with fallback routing:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
2. **CDN / Cloudflare Pages / Vercel**: Static output can be deployed directly to edge CDNs with zero server compute required.

