# Partner Routes — Reference

## POST /verify-adhar
Route:
- POST /verify-adhar
- Middlewares: `authLimiter`, `partnerUpload`, `handleUploadError`
- Controller: `partnerController.register`

Purpose:
- Register or verify a partner by submitting personal details and Aadhaar documents (files).
- `authLimiter` applies rate limiting.
- `partnerUpload` handles multipart/form-data file upload and enforces allowed mime-types / file size.
- `handleUploadError` normalizes upload errors (e.g., file too large, invalid mime).

Request:
- Content-Type: multipart/form-data
- Fields (example):
  - name (string) — required
  - phone (string) — required
  - email (string) — optional
  - aadhaarNumber (string) — required
  - other metadata fields as implemented
- Files (example keys):
  - profilePicture — single image (jpeg/png)
  - aadhaarFront — image/pdf
  - aadhaarBack — image/pdf

Allowed file types and sizes:
- See config.upload.allowedMimeTypes and config.upload.maxFileSize.
  - Example mime-types: image/jpeg, image/jpg, image/png, application/pdf
  - Example max size: config.upload.maxFileSize (bytes)

Responses:
- 201 Created
  - Body: { success: true, id: "<partnerId>", message: "Registered / verification submitted" }
- 400 Bad Request
  - Missing required fields or invalid Aadhaar format
- 413 Payload Too Large
  - File exceeds configured max size
- 415 Unsupported Media Type
  - File mime-type not allowed
- 429 Too Many Requests
  - Rate limit hit (from `authLimiter`)
- 500 Internal Server Error
  - Unexpected error while saving files or DB error

Notes:
- Files should be validated server-side (file type, OCR checks if applicable).
- Store originals in secure storage (S3) and save metadata/paths in DB.
- Return only metadata or signed URLs, never raw storage paths.

---

## GET /profile-picture
Route:
- GET /profile-picture
- Controller: `partnerController.getProfilePicture`

Purpose:
- Return a signed URL to access the partner's profile image.

Request:
- Query or headers (implementation-dependent):
  - ?partnerId=<id>  OR Authorization header (Bearer token) to infer partner id
- Optional: accept a `size` or `variant` query to request resized variants (if supported).

Responses:
- 200 OK
  - Body: { success: true, url: "<signed-url>", expiresIn: <seconds> }
  - `expiresIn` should match config.signedUrlExpiration (seconds).
- 404 Not Found
  - No profile picture available for given partner
- 401 / 403
  - Unauthorized / Forbidden if access is restricted
- 500
  - Error generating signed URL

Security:
- Signed URL should be time-limited; expiration controlled by config.SIGNED_URL_EXPIRATION (default 3600s).
- Ensure authorization checks if pictures are private.

---

## GET /aadhaar-documents
Route:
- GET /aadhaar-documents
- Controller: `partnerController.getAadhaarDocuments`

Purpose:
- Return one or multiple signed URLs for the partner's Aadhaar documents (front/back or additional files).

Request:
- Query or headers:
  - ?partnerId=<id>  OR Authorization header to infer partner id

Responses:
- 200 OK
  - Body: { success: true, documents: [{ name: "aadhaarFront", url: "<signed-url>", expiresIn: <seconds> }, ...] }
- 404 Not Found
  - No documents found
- 401 / 403
  - Unauthorized / Forbidden if access restricted
- 500
  - Error generating signed URLs

Security & Privacy:
- Aadhaar documents are sensitive — enforce strict access control, logging and short signed-url expiry.
- Prefer returning URLs only to authorized users and consider additional audit trails.

---

General implementation tips
- Reuse config values:
  - `config.upload.allowedMimeTypes`
  - `config.upload.maxFileSize`
  - `config.signedUrlExpiration` (seconds)
- Normalize and centralize error responses so clients can handle them consistently.
- Add unit/integration tests for:
  - upload middleware behavior (accept/reject files)
  - signed URL generation and expiry
  - auth/rate-limit responses

