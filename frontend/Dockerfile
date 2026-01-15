# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI
ARG VITE_SOCKET_URL

ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI
s

# Build ra thư mục dist
RUN npm run build

#-------------------------------------

# 2. Serve Stage (Nginx)
FROM nginx:alpine

# Copy config nginx (bước quan trọng để không bị lỗi 404 khi refresh trang)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy file build từ stage trước
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]