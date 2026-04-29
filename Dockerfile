FROM node:22-slim
COPY . .
EXPOSE 6001
CMD ["npm","start"] 
