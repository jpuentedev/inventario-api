FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Primero solo las dependencias: esta capa se reutiliza mientras package*.json no cambie
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY db ./db
COPY src ./src

# No correr como root dentro del contenedor
USER node

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

# Crea las tablas (y el primer admin) si faltan y arranca; exec deja a Node como proceso principal
# para que reciba SIGTERM y cierre limpio
CMD ["sh", "-c", "node db/init.js && exec node src/server.js"]
