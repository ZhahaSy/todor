
export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    avatar: string;
}

export interface CreateUserDto {
    username: string;
    password: string;
    email: string;
    work_address: string;
    address: string;
    hobby: string;
    life_routine: string;
    name: string;
    phone: string;
    gender: 'male' | 'female';
    age: number;
    job: string;
    confirm_password: string;
}