import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@prisma/prisma.service";
import { User, Prisma } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService
  ) {

  }

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput
  ): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: userWhereUniqueInput
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return this.prisma.user.create({
        data
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where
    });
  }

  async userLogin(data: Prisma.UserCreateInput): Promise<User> {
    let user: User;
    try {
      user = await this.prisma.user.findUnique({ where: { account: data.account } });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
    if (user) return user;
    return await this.createUser(data);
  }

  async checkUserExistent(account: string): Promise<boolean> {
    try {
      const user: Prisma.UserCreateInput = await this.prisma.user.findUnique({ where: { account } });
      return !!user;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }


}
