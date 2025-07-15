import { Column } from 'typeorm';

export class LoginDto {
  @Column({
    comment: '用户名',
    length: 255,
  })
  name: string;

  @Column({
    comment: '密码',
    length: 255,
  })
  password: string;
}
