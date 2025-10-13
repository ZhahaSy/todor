import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    comment: '用户名',
    length: 255,
  })
  name: string;

  @Column({
    comment: '手机号',
    length: 255,
  })
  phone: string;

  @Column({
    comment: '性别',
    type: 'varchar',
    enum: ['male', 'female'],
    default: 'male',
  })
  gender: 'male' | 'female';

  @Column({
    comment: '年龄',
    type: 'int',
    default: 18,
  })
  age: number;

  @Column({
    comment: '工作',
    length: 255,
    default: '',
  })
  job: string;

  @Column({
    comment: '公司地址',
    length: 255,
    default: '',
  })
  work_address: string;

  @Column({
    comment: '居住地',
    length: 255,
    default: '',
  })
  address: string;

  @Column({
    comment: '爱好',
    length: 255,
    default: '',
  })
  hobby: string;

  @Column({
    comment: '生活作息表',
    length: 255,
    default: '',
  })
  schedule: string;

  @Column({
    comment: '是否删除',
    default: false,
  })
  @Column({
    comment: '是否登录',
    default: false,
  })
  logging: boolean;

  @Column({
    comment: '密码',
    length: 255,
    default: '',
  })
  hashPwd: string;
  @Column({
    comment: '盐',
    length: 255,
    default: '',
  })
  salt: string;

  @Column({
    comment: '是否删除',
    default: false,
  })
  deleted: boolean;

  @Column({
    comment: '邮箱',
    length: 255,
    default: '',
  })
  email: string;
}
