# Sử dụng image có sẵn với Nodejs và npm
FROM node:14

# Thiết lập thư mục làm việc trong container
WORKDIR /src

# Sao chép package.json và package-lock.json vào thư mục làm việc
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Sao chép tất cả các file từ thư mục hiện tại vào thư mục làm việc trong container
COPY . .

# Build ứng dụng NestJS
RUN npm run build

# Expose cổng mà ứng dụng của bạn sử dụng (thường là cổng 3000)
EXPOSE 3000

# Chạy ứng dụng khi container được khởi chạy
CMD ["npm", "run", "start:prod"]
