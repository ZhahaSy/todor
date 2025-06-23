export class CreateUserDto {
  readonly name: string;
  readonly phone: string;
  readonly gender: 'male' | 'female';
  readonly age: number;
  readonly job: string;
  readonly work_address: string;
  readonly address: string;
  readonly hobby: string;
  readonly life_routine: string;
}
