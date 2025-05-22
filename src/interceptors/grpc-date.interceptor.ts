import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class GrpcDateInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        if (!data) return data;
        
        const transformDates = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj;
          
          if (obj instanceof Date) {
            return obj.toISOString();
          }
          
          if (Array.isArray(obj)) {
            return obj.map(item => transformDates(item));
          }
          
          const result = { ...obj };
          for (const key in result) {
            if (result[key] instanceof Date) {
              result[key] = result[key].toISOString();
            } else if (typeof result[key] === 'object') {
              result[key] = transformDates(result[key]);
            }
          }
          
          return result;
        };
        
        return transformDates(data);
      }),
    );
  }
} 