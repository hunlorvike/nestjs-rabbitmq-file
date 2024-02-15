import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
dotenv.config();

async function bootstrap() {
	const PORT = process.env.PORT;
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.useGlobalInterceptors(new ResponseInterceptor());

	app.useStaticAssets(join(__dirname, '..', 'public'), {
		prefix: '/',
		setHeaders: (res) => {
			res.set('Cache-Control', 'max-age=2592000');
		},
	});

	const config = new DocumentBuilder()
		.addBearerAuth()
		.setTitle("RabbitMQ File")
		.setDescription('Ứng dụng chat là một nền tảng giao tiếp đa phương tiện mạnh mẽ, được xây dựng trên cơ sở của NestJS, một framework Node.js hiệu suất cao và linh hoạt. Với giao diện người dùng thân thiện và tính năng đa dạng, ứng dụng này cung cấp trải nghiệm giao tiếp trực tuyến đồng thời và hiệu quả.')
		.setVersion("1.0")
		.addTag('Version 1.0')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup(`api/swagger`, app, document);


	// Start the application on port 3000
	await app.listen(PORT, () => console.log(`Application running on port: ${PORT}`));
}
bootstrap();
