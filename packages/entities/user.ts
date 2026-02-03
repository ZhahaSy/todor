
export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: 'male' | 'female';
    age: number;
    job: string;
    work_address: string;
    address: string;
    hobby: string;
    schedule: string;
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

export interface UpdateUserDto {
    name?: string;
    phone?: string;
    email?: string;
    gender?: 'male' | 'female';
    age?: number;
    job?: string;
    work_address?: string;
    address?: string;
    hobby?: string;
    schedule?: string;
}

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}