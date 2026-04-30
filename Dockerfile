FROM node:22-slim
COPY . .
RUN npm install
EXPOSE 6001
CMD ["npm","run","dev"] 
