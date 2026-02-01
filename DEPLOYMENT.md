# Deployment Guide

## 🚀 Production Deployment Checklist

### **1. Frontend Deployment (Cloudflare Pages / Vercel / Netlify)**

#### **Environment Variables**
```bash
# Optional: Override API URL (defaults to https://api.adangarcia.com/backend)
VITE_API_BASE_URL=https://api.adangarcia.com/backend
```

#### **Build Configuration**
```bash
# Build command
npm run build

# Output directory
dist
```

---

### **2. Backend CORS Configuration** ⚠️

**Current Issue**: CORS errors when frontend at `https://homework.adangarcia.com` calls API at `https://api.adangarcia.com`

#### **Required Backend Changes**

Add these headers to your backend API responses:

```javascript
// Express.js example
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://homework.adangarcia.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

#### **Nginx Configuration** (if using nginx as reverse proxy)
```nginx
location /backend {
    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://homework.adangarcia.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # Handle preflight
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass http://your-backend:3000;
}
```

---

### **3. Content Security Policy (CSP)** 🔒

#### **Meta Tag CSP** (Current - index.html)
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; 
           style-src 'self' 'unsafe-inline'; 
           img-src 'self' data: https:; 
           connect-src 'self' https://api.adangarcia.com https://*.adangarcia.com wss://api.adangarcia.com ws://localhost:* http://localhost:*; 
           font-src 'self' data:; 
           worker-src 'self' blob:; 
           manifest-src 'self'; 
           object-src 'none'; 
           base-uri 'self'; 
           form-action 'self';" 
/>
```

#### **HTTP Header CSP** (Recommended - Cloudflare/Server)

**⚠️ Note**: `frame-ancestors` directive **ONLY** works via HTTP headers, not meta tags.

Set this in your hosting platform (Cloudflare Pages, Vercel, Netlify):

**Cloudflare Pages** (`_headers` file):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.adangarcia.com https://*.adangarcia.com wss://api.adangarcia.com; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.adangarcia.com https://*.adangarcia.com wss://api.adangarcia.com; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

**Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.adangarcia.com wss://api.adangarcia.com; worker-src 'self' blob:; frame-ancestors 'none';"
    X-Frame-Options = "DENY"
```

---

### **4. CSP Warnings Explained**

#### **Warning**: `frame-ancestors` ignored in meta element
**Cause**: This directive only works via HTTP headers  
**Solution**: Add via server/hosting platform headers (see section 3 above)

#### **Error**: Cloudflare Insights script blocked
**Cause**: `script-src 'self'` blocks external scripts  
**Solution**: Already fixed - added `https://static.cloudflareinsights.com` to CSP

---

### **5. Strict CSP (Optional - Maximum Security)**

For maximum security in production, replace `'unsafe-inline'` and `'unsafe-eval'` with nonces/hashes:

```bash
# Build with CSP nonces
npm run build

# Generate hash of inline scripts
# Then update CSP with actual hashes
```

**Build tool configuration** (vite.config.js):
```javascript
export default defineConfig({
  build: {
    // Generate integrity hashes
    rollupOptions: {
      output: {
        // Enable integrity checks
      }
    }
  }
});
```

---

### **6. Testing Deployment**

#### **Check CSP**
```bash
# Test CSP headers
curl -I https://homework.adangarcia.com

# Should see:
# Content-Security-Policy: ...
```

#### **Check CORS**
```bash
# Test CORS preflight
curl -X OPTIONS https://api.adangarcia.com/backend/api/auth/init \
  -H "Origin: https://homework.adangarcia.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should see:
# Access-Control-Allow-Origin: https://homework.adangarcia.com
```

#### **Test Authentication**
1. Open browser DevTools → Network tab
2. Try to create/join a room
3. Check for:
   - ✅ No CORS errors
   - ✅ No CSP violations
   - ✅ Successful API responses

---

### **7. Common Issues & Solutions**

#### **Issue**: CORS error `No 'Access-Control-Allow-Origin' header`
**Solution**: Update backend to include CORS headers (see Section 2)

#### **Issue**: CSP blocks Cloudflare Insights
**Solution**: Add `https://static.cloudflareinsights.com` to `script-src` (already done)

#### **Issue**: Service Worker not registering
**Solution**: Ensure served over HTTPS and CSP allows `worker-src 'self' blob:`

#### **Issue**: WebSocket connection fails
**Solution**: Add `wss://api.adangarcia.com` to `connect-src` (already done)

---

### **8. Performance Optimization**

#### **Enable HTTP/2**
Ensure your hosting supports HTTP/2 for better performance

#### **Enable Compression**
```nginx
# Nginx example
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

#### **Set Cache Headers**
```
# Cloudflare Pages _headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable
  
/*.css
  Cache-Control: public, max-age=31536000, immutable
```

---

### **9. Monitoring**

#### **Error Tracking**
Consider integrating error tracking:
- Sentry
- LogRocket
- Rollbar

#### **Web Vitals**
Already integrated! Uncomment analytics code in `src/utils/webVitals.js`:

```javascript
// Google Analytics 4
if (window.gtag) {
  window.gtag('event', metric.name, {
    value: Math.round(metric.value),
    metric_id: metric.id,
  });
}
```

---

### **10. Environment-Specific Settings**

#### **Development**
- Loose CSP (allows localhost)
- Debug logging enabled
- Source maps enabled

#### **Production**
- Strict CSP via HTTP headers
- No console.log (via logger.js)
- Optimized builds
- HTTPS only

---

## 📋 Pre-Deployment Checklist

- [ ] Backend CORS headers configured
- [ ] CSP headers set via hosting platform
- [ ] Environment variables set
- [ ] HTTPS certificate active
- [ ] Service worker registering
- [ ] Web Vitals monitoring configured
- [ ] Error tracking integrated (optional)
- [ ] API URL pointing to production backend
- [ ] Test authentication flow
- [ ] Test real-time sync
- [ ] Test PWA offline functionality

---

## 🆘 Quick Fixes

### **Current Production Issues**

1. **Fix CORS** (Backend):
```javascript
// Add to your Express server
const cors = require('cors');
app.use(cors({
  origin: 'https://homework.adangarcia.com',
  credentials: true
}));
```

2. **Fix CSP frame-ancestors warning**:
   - Remove from index.html meta tag
   - Add via Cloudflare Page Rules or `_headers` file

3. **Allow Cloudflare Insights**:
   - ✅ Already fixed in updated index.html

---

## 📚 Resources

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
- [Vercel Headers](https://vercel.com/docs/edge-network/headers)
- [Web Vitals](https://web.dev/vitals/)
