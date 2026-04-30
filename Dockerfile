FROM node:22-slim
COPY . .
RUN npm install
RUN npm run build
EXPOSE 6001
CMD ["npm","run","dev"] 
