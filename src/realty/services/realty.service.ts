import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRealtyDto } from '../dto/create-realty.dto';
import { RealtyStatus } from '../types/relaty-status.enum';
import { Prisma } from '@prisma/client';
import { equals } from 'class-validator';

@Injectable()
export class RealtyService {
  constructor(private readonly prisma: PrismaService) {}

  async createNewRealty(data: any, userId: string) {
    const realty = await this.prisma.realty.create({
      data: {
        categoryId: data.categoryId,
        status: RealtyStatus.DRAFT,
        description: data.description,
        ownerId: userId,
        mainPhoto: data.imageSrc,
        price: new Prisma.Decimal(data.price),
        guestCount: data.guestCount,
        bathroomCount: data.bathroomCount,
        title: data.title,
        location: data.location,
        wcCount: data.wcCount,
        hasKitchen: data.hasKitchen,
        hasParking: data.hasParking,
        city: data.city || '',
        address: data.address || '',
        images: data.images || [],
        roomCount: data.roomCount,
        childrenCount: data.childrenCount,
        bathType: data.bathType,
        showerCount: data.showerCount,
        hasPlayground: data.hasPlayground,
        bathroomIsCombined: data.bathroomIsCombined,
        isAccessible: data.isAccessible,
        hasBreakfast: data.hasBreakfast,
        hasDinner: data.hasDinner,
        hasLunch: data.hasLunch,
      },
    });

    return realty;
  }

  async getAll(body = null) {
    console.log(body);
    let where: any = {};


    if (body.location?.label) {
      where.location = { equals: body.location };
    }

    if (body.city?.label) {
      where.location = { equals: body.city };
    }

    if (body.guestCount != null) {
      where.guestCount = {
        gte: body.guestCount,
      };
    }

    if (body.childrenCount != null) {
      where.childrenCount = {
        gte: body.childrenCount,
      };
    }

    if (body.categoryId != null) {
      where.categoryId = body.categoryId;
    }

    const list = await this.prisma.realty.findMany({
      include: {
        category: true,
        favorites: true,
      },
      where,
    });

    return list;
  }

  async getById(id: string) {
    const found = await this.prisma.realty.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        favorites: true,
        bookings: true,
        bookingSlots: true,
      },
    });

    const slots = found.bookingSlots.map((b) => b.date);
    const booked = found.bookings.map((b) => [b.startDate, b.endDate]);

    for (const book of booked) {
      const [start, end] = book;

      slots.forEach((slot, index) => {
        if (slot >= start && slot <= end) {
          slots[index] = null;
        }
      });
    }

    return {
      ...found,
      slots,
      booked,
    };
  }

  async getRealtiesByUser(userId: string) {
    const list = await this.prisma.realty.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        category: true,
        bookings: true,
        bookingSlots: true,
      },
    });

    return { list };
  }

  async like(realtyId: string, userId: string) {
    const found = await this.prisma.favorites.findFirst({
      where: {
        realtyId,
        userId,
      },
    });

    if (found) {
      await this.prisma.favorites.delete({
        where: {
          id: found.id,
        },
      });
    } else {
      await this.prisma.favorites.create({
        data: {
          userId,
          realtyId,
        },
      });
    }
  }

  async getFavoritesRealties(userId: string) {
    const list = await this.prisma.favorites.findMany({
      where: {
        userId,
      },
      select: {
        realty: {
          include: {
            category: true,
            favorites: true,
            bookingSlots: true,
          },
        },
      },
    });

    return {
      list: list.map((i) => i.realty),
    };
  }

  async updateRealtyInfo(id: string, data) {
    const oldData = await this.prisma.realty.findUnique({
      where: {
        id,
      },
    });

    // const images = [];
    // if (data.images) {
    //   new Set([...data.images, ...oldData.images]).forEach((item) =>
    //     images.push(item),
    //   );
    // }

    if (data.price != null) {
      data.price = new Prisma.Decimal(data.price);
    }

    const categoryId = data.categoryId;

    let updateCategory: any = {
      category: {
        connect: {
          id: categoryId,
        },
      }
    };

    if (categoryId == null) {
      updateCategory = {};
    }

    delete data.categoryId;


    const updated = await this.prisma.realty.update({
      where: {
        id,
      },
      data: {
        ...data,
        ...updateCategory,
      },
    });

    return updated;
  }

  async addBookingSlots(realtyId: string, dates: Date[]) {
    const created = await this.prisma.bookingSlots.createMany({
      data: dates.map((date) => ({
        realtyId,
        date,
      })),
    });

    return created;
  }
}
