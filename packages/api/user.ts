import { CreateUserDto, User, UpdateUserDto, ChangePasswordDto } from "@client/entities";
import request from "@client/request";


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

export const updateUserInfo = async (params: UpdateUserDto) => {
    return request.put<User>('/user/update', params);
}

export const changePassword = async (params: ChangePasswordDto) => {
    return request.post<null>('/user/change-password', params);
}

export const exportUserData = async () => {
    return request.get<User>('/user/export-data');
}
