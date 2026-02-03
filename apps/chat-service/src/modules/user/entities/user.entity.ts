import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // 添加索引：登录时通过用户名查询
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
    comment: '是否登录',
    default: false,
  })
  logging: boolean;

  @Column({
    comment: '密码哈希',
    length: 255,
    default: '',
  })
  hashPwd: string;

  @Column({
    comment: '盐（已废弃，Argon2不需要）',
    length: 255,
    default: '',
    nullable: true,
  })
  salt: string;

  @Column({
    comment: '是否删除',
    default: false,
  })
  deleted: boolean;

  @Index() // 添加索引：可能通过邮箱查询用户
  @Column({
    comment: '邮箱',
    length: 255,
    default: '',
  })
  email: string;
}
