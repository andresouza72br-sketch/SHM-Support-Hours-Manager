# Stage 1: Build da SPA React
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Copia código e realiza o build
COPY . .
RUN npm run build

# Stage 2: Runtime Nginx
FROM nginx:1.27-alpine

# Remove configuração padrão
RUN rm -f /etc/nginx/conf.d/default.conf

# Copia configuração otimizada com proxy reverso e SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build estático
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
