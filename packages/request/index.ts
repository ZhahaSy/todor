import { message } from "antd";
import axios, { AxiosRequestConfigPluginOriginalData } from "axios";

const CodeMessage: Record<number, string> = {
  200: "服务器成功返回请求的数据。",
  201: "新建或修改数据成功。",
  202: "一个请求已经进入后台排队（异步任务）。",
  204: "删除数据成功。",
  400: "请求参数错误",
  401: "用户没有权限（令牌、用户名、密码错误）。",
  403: "用户得到授权，但是访问是被禁止的。",
  404: "接口地址不存在",
  405: "请求方式不支持。",
  406: "请求的格式不可得。",
  410: "请求的资源被永久删除，且不会再得到的。",
  422: "当创建一个对象时，发生一个验证错误。",
  500: "服务器发生错误，请检查服务器。",
  502: "网关错误。",
  503: "服务不可用，服务器暂时过载或维护。",
  504: "网关超时。",
};

const instance = axios.create({
  withCredentials: true,
  baseURL: "/api/",
});

instance.interceptors.request.use((config) => {
  return config;
});

instance.interceptors.response.use(
  // 当 status >= 200 && status < 300 时，会进入此逻辑
  (response) => {
    const { data: responseData, config, request } = response;

    if (
      (config as AxiosRequestConfigPluginOriginalData<unknown>)
        .originalResponse ||
      request.responseType
    ) {
      return responseData;
    }
    if (
      responseData.code !== 0 &&
      response.headers["content-type"].includes("application/json")
    ) {
      if (!config.skipError && !config.quiet) {
        message.error(responseData.msg ?? "请求异常");
      }
      return Promise.reject(response);
    }
    return responseData.data;
  },
  // 当 status > 300 时，会进入此逻辑
  (error) => {
    if (error.response.status === 401) {
      message.destroy();
      message.error("请先登录");
      window.location.href = "/login";
      return Promise.reject(error);
    }
    if (error.config.headers["content-type"] === "multipart/form-data") {
      message.destroy();
      message.error(CodeMessage[error.response.status] ?? "请求异常");
      return Promise.reject(error);
    }

    if (error.response && !error.config.quiet && !error.config.skipError) {
      message.error(CodeMessage[error.response.status] ?? "请求异常");
    }
    return Promise.reject(error);
  }
);
export default instance;
