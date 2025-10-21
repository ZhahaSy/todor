import { CreateUserDto, User } from "@client/entities";
import request from "@client/request";


export const getUserList = async () => {
    return request.get<User[]>('/user/list');
}

export const login = async (params: {
    username: string;
    password: string;
}) => {
    return request.post<{token: string}>('/user/login', params);
}

export const getUserInfo = async () => {
    return request.get<User>('/user/info');
}

export const createUser = async (params: CreateUserDto) => {
    return request.post<{token: string}>('/user/create', params);
}
