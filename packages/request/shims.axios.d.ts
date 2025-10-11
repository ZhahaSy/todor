/* eslint-disable @typescript-eslint/ban-ts-comment */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BaseResponse<T> {
    data?: T;
    message: string;
    code: number;
}
declare module 'axios' {
    export interface AxiosRequestConfig {
        /**
         * 是否关闭所有提示
         *
         * 如果设置为 true，则会关闭所有自动提示
         */
        quiet?: true;

        /**
         * 是否跳过 错误提示
         * 如果设置为 true，那么请求成功，但是业务报错（status=200 & data.code!=0）时，将不会自动提示
         */
        skipError?: true;

        /**
         * 是否跳过 成功提示
         * 如果设置为 true，那么当请求成功（method !== get & status=200 & data.code==0）时，将不会自动提示
         */
        skipSuccess?: true;
    }

    export interface AxiosRequestConfigPluginOriginalData<D> extends AxiosRequestConfig<D> {
        /**
         * 是否返回 原始响应数据
         * 如果设置为 true，则会返回 BaseResponse 对象
         */
        originalResponse?: true;
    }

    export interface AxiosInstance {
        <T>(config: AxiosRequestConfig): Promise<T>;
        <T>(config: AxiosRequestConfigPluginOriginalData<T>): Promise<BaseResponse<T>>;

        request<T = any, D = any>(config: AxiosRequestConfig<D>): Promise<T>;
        // request<T = any, R = BaseResponse<T>, D = any>(config: AxiosRequestConfigPluginOriginalData<D>): Promise<R>;

        get<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
        get<T = any, R = BaseResponse<T>, D = any>(url: string, config?: AxiosRequestConfigPluginOriginalData<D>): Promise<R>;

        delete<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
        delete<T = any, R = BaseResponse<T>, D = any>(url: string, config?: AxiosRequestConfigPluginOriginalData<D>): Promise<R>;

        head<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
        head<T = any, R = BaseResponse<T>, D = any>(url: string, config?: AxiosRequestConfigPluginOriginalData<D>): Promise<R>;

        options<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
        options<T = any, R = BaseResponse<T>, D = any>(url: string, config?: AxiosRequestConfigPluginOriginalData<D>): Promise<R>;

        post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
        post<T = any, R = BaseResponse<T>, D = any>(
            url: string,
            data?: D,
            config?: AxiosRequestConfigPluginOriginalData<D>,
        ): Promise<R>;

        put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
        put<T = any, R = BaseResponse<T>, D = any>(
            url: string,
            data?: D,
            config?: AxiosRequestConfigPluginOriginalData<D>,
        ): Promise<R>;

        patch<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
        patch<T = any, R = BaseResponse<T>, D = any>(
            url: string,
            data?: D,
            config?: AxiosRequestConfigPluginOriginalData<D>,
        ): Promise<R>;
    }
}
