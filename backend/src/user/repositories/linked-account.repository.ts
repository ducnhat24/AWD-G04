import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkedAccount, LinkedAccountDocument } from '../entities/linked-account.entity';

@Injectable()
export class LinkedAccountRepository {
    constructor(
        @InjectModel(LinkedAccount.name)
        private readonly linkedAccountModel: Model<LinkedAccountDocument>,
    ) { }

    async findByProviderAndId(
        provider: string,
        providerId: string,
    ): Promise<LinkedAccountDocument | null> {
        return this.linkedAccountModel
            .findOne({ provider, providerId })
            .exec();
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<LinkedAccountDocument[]> {
        return this.linkedAccountModel.find({ user: userId }).exec();
    }

    async findByUserIdAndProvider(
        userId: string | Types.ObjectId,
        provider: string,
    ): Promise<LinkedAccountDocument | null> {
        const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        return this.linkedAccountModel
            .findOne({ user: userObjectId, provider })
            .exec();
    }

    async findAllByProvider(provider: string): Promise<LinkedAccountDocument[]> {
        return this.linkedAccountModel.find({ provider }).exec();
    }

    async create(data: Partial<LinkedAccount>): Promise<LinkedAccountDocument> {
        const account = new this.linkedAccountModel(data);
        return account.save();
    }

    async updateTokens(
        id: Types.ObjectId | string,
        accessToken: string,
        refreshToken?: string,
    ): Promise<LinkedAccountDocument | null> {
        const updateData: any = { accessToken };
        if (refreshToken) {
            updateData.refreshToken = refreshToken;
        }

        return this.linkedAccountModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true },
        );
    }
}
