import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { map } from 'rxjs/operators';

interface ResponseData {
    data?: any;
    code?: number;
    msg?: string | null;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
    ): import('rxjs').Observable<any> | Promise<import('rxjs').Observable<any>> {
        return next.handle().pipe(
            map((content: ResponseData) => ({
                data: content?.data ?? {},
                code: content?.code ?? HttpStatus.OK,
                msg: content?.msg ?? null,
            })),
        );
    }
}
