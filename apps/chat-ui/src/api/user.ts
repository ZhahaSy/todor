import { User } from "../entities/user";
import request from "../request";


export const getUserList = async () => {
    return request.get<User[]>('/user/list');
}

export const login = async (params: {
    username: string;
    password: string;
}) => {
    return request.post<{token: string}>('/user/login', params);
}
