# Stage 1: build React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Stage 2: serve with nginx (non-root, unprivileged port 8080)
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp \
        /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp \
    && sed -i 's|/run/nginx.pid|/tmp/nginx/nginx.pid|g' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /tmp/nginx

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
