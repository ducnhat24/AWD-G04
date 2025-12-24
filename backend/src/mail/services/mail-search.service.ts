import { Injectable, Logger } from '@nestjs/common';
import { MailRepository } from '../mail.repository';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { EmailMetadata, EmailMetadataDocument } from '../entities/email-metadata.schema';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
const Fuse = require('fuse.js');

/**
 * MailSearchService
 * Chịu trách nhiệm tìm kiếm và lọc emails
 * - Fuzzy search trong DB với Fuse.js
 * - Ranking theo độ liên quan
 * - Filter theo label
 */
@Injectable()
export class MailSearchService {
    private readonly logger = new Logger(MailSearchService.name);
    private genAI: GoogleGenerativeAI;
    private embeddingModel: any;

    constructor(
        private mailRepository: MailRepository,
        private configService: ConfigService,
        // Inject Model trực tiếp để dùng aggregate
        @InjectModel(EmailMetadata.name) private emailModel: Model<EmailMetadataDocument>,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
        }
    }

    /**
     * Fuzzy search emails trong DB
     * Sử dụng Fuse.js cho partial match và typo tolerance
     * 
     * @param userId - ID của user
     * @param query - Từ khóa tìm kiếm
     * @param labelId - Filter theo label (optional)
     * @param limit - Số lượng kết quả trả về
     * @returns Danh sách emails theo độ liên quan
     */
    async searchEmailsFuzzy(
        userId: string,
        query: string,
        labelId?: string,
        limit: number = 20,
    ) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        // 1. Lấy emails từ DB (giới hạn 1000 emails gần nhất để tối ưu)
        const allEmails = await this.mailRepository.findAllByUserId(userId, 1000);

        if (allEmails.length === 0) {
            return [];
        }

        // 2. Cấu hình Fuse.js cho fuzzy search
        const options = {
            keys: [
                { name: 'subject', weight: 0.5 },  // Subject quan trọng nhất
                { name: 'from', weight: 0.3 },     // Sender quan trọng nhì
                { name: 'snippet', weight: 0.2 },  // Snippet ít quan trọng hơn
            ],
            includeScore: true,
            threshold: 0.4,        // Độ mờ: 0.0 = khớp tuyệt đối, 1.0 = khớp tất cả
            ignoreLocation: true,  // Tìm bất kỳ đâu trong chuỗi (partial match)
        };

        const fuse = new Fuse(allEmails, options);

        // 3. Thực hiện search
        const result = fuse.search(query);

        // 4. Map kết quả theo format frontend
        const mappedResults = result.slice(0, limit).map((fuseResult: any) => {
            const email = fuseResult.item;
            return {
                id: email.messageId,
                threadId: email.threadId,
                snippet: email.snippet,
                subject: email.subject,
                sender: email.from,
                date: email.date ? email.date.toString() : '',
                isRead: email.isRead,
                isStarred: email.labelIds ? email.labelIds.includes('STARRED') : false,
            };
        });

        return mappedResults;
    }

    async searchSemantic(userId: string, query: string, limit: number = 20) {
        try {
            if (!this.embeddingModel) return [];

            // 1. Tạo vector cho query của user
            const result = await this.embeddingModel.embedContent(query);
            const queryVector = result.embedding.values;

            this.logger.log(`DEBUG SEARCH - Input userId: ${userId} (Type: ${typeof userId})`);
            // 2. Thực hiện Vector Search trên MongoDB Atlas
            const emails = await this.emailModel.aggregate([
                {
                    $vectorSearch: {
                        index: "vector_index", // Tên index bạn đặt trên Atlas
                        path: "embedding",
                        queryVector: queryVector,
                        numCandidates: 100, // Số lượng vector ứng viên để xét
                        limit: limit,
                        filter: {
                            userId: userId
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        id: "$messageId",
                        messageId: 1,
                        threadId: 1,
                        subject: 1,
                        snippet: 1,
                        from: 1,
                        date: 1,
                        isRead: 1,
                        labelIds: 1,
                        score: { $meta: "vectorSearchScore" } // Lấy điểm tương đồng
                    }
                }
            ]);

            if (emails.length > 0) {
                this.logger.log(`DEBUG SEARCH - Found email with userId: ${emails[0].userId}`);
            }

            // 3. Map kết quả
            return emails.map(email => ({
                id: email.messageId,
                threadId: email.threadId,
                snippet: email.snippet,
                subject: email.subject,
                sender: email.from,
                date: email.date ? email.date.toString() : '',
                isRead: email.isRead,
                isStarred: email.labelIds ? email.labelIds.includes('STARRED') : false,
                score: email.score
            }));

        } catch (error) {
            this.logger.error(`Semantic search error: ${error.message}`);
            // Fallback về fuzzy search nếu lỗi vector search
            return this.searchEmailsFuzzy(userId, query, undefined, limit);
        }
    }

    /**
     * Filter emails theo các tiêu chí
     * (Có thể mở rộng thêm các filter khác: date range, has attachment, etc.)
     */
    async filterEmails(
        userId: string,
        filters: {
            labelId?: string;
            isRead?: boolean;
            isStarred?: boolean;
            dateFrom?: Date;
            dateTo?: Date;
        },
        limit: number = 20,
    ) {
        const emails = await this.mailRepository.filterEmails(userId, filters, limit);

        return emails.map((email) => ({
            id: email.messageId,
            threadId: email.threadId,
            snippet: email.snippet,
            subject: email.subject,
            sender: email.from,
            date: email.date ? email.date.toString() : '',
            isRead: email.isRead,
            isStarred: email.labelIds ? email.labelIds.includes('STARRED') : false,
        }));
    }
}
