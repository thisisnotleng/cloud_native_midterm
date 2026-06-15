# Version Policy

This project avoids `latest` Docker tags for runtime images.

## Node.js

Use Node.js 24 LTS:

```Dockerfile
FROM node:24-alpine
```

Reason:

- Node.js 24 is an LTS release.
- LTS versions are better for assignment deployment and production-style screenshots.
- Node.js 26 is a Current release, not the safest choice for this project.

Each service also declares:

```json
{
  "engines": {
    "node": ">=24 <25"
  }
}
```

## Nginx

Nginx is not used yet. If we add it later for reverse proxy or load balancing, use a stable pinned version such as:

```Dockerfile
FROM nginx:1.26-alpine
```

Do not use:

```Dockerfile
FROM node:latest
FROM nginx:latest
```
