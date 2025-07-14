import { User } from "../entities/user";
import request from "../request";


export const getUserList = async () => {
    return request.get<User[]>('/user/list');
}

