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
            if (!this.embeddingModel) {
                this.logger.error("❌ Embedding Model chưa khởi tạo. Kiểm tra GEMINI_API_KEY.");
                return [];
            }

            this.logger.log(`🔍 Bắt đầu Semantic Search cho User: ${userId} - Query: ${query}`);

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
                        userId: 1, // <--- THÊM DÒNG NÀY
                        score: { $meta: "vectorSearchScore" } // Lấy điểm tương đồng
                    },
                },
                {
                    $match: {
                        score: { $gte: 0.65 }
                    }
                }
            ]);

            if (emails.length > 0) {
                this.logger.log(`DEBUG SEARCH - Found email with userId: ${emails[0].userId}`);
            }

            this.logger.log(`✅ Kết quả tìm thấy: ${emails.length} emails`);
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
            this.logger.error(`❌ LỖI SEMANTIC SEARCH: ${JSON.stringify(error)}`);
            // Fallback về fuzzy search nếu lỗi vector search
            return this.searchEmailsFuzzy(userId, query, undefined, limit);
        }
    }

    async getSuggestions(userId: string, query: string): Promise<string[]> {
        // 1. Validate đầu vào
        if (!query || query.trim().length < 2) return [];

        // Xử lý ký tự đặc biệt để không lỗi Regex
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeQuery, 'i');

        // 2. Query DB (Song song)
        const [senders, subjects] = await Promise.all([
            // Tìm Sender (Distinct)
            this.emailModel
                .find({ userId: userId, from: regex })
                .distinct('from')
                .exec(),

            // Tìm Subject (Lấy 20 kết quả gần nhất để gợi ý)
            this.emailModel
                .find({ userId: userId, subject: regex })
                .select('subject')
                .sort({ date: -1 }) // Ưu tiên email mới nhất
                .limit(20)
                .exec(),
        ]);

        const suggestions = new Set<string>();

        // --- A. XỬ LÝ SENDER (Giữ nguyên) ---
        senders.slice(0, 5).forEach((sender: string) => {
            const nameMatch = sender.match(/^([^<]+)/);
            const cleanName = nameMatch ? nameMatch[1].trim() : sender;
            if (cleanName.toLowerCase().includes(query.toLowerCase())) {
                suggestions.add(cleanName);
            }
        });

        // --- B. XỬ LÝ SUBJECT (Logic mới: Smart Display) ---
        subjects.forEach((item) => {
            if (!item.subject) return;

            const subject = item.subject.trim();

            // CASE 1: Tiêu đề ngắn (< 70 ký tự) -> Lấy luôn cả câu cho có nghĩa
            // Ví dụ: "Yêu cầu quyền truy cập" -> Lấy hết.
            if (subject.length < 70) {
                suggestions.add(subject);
                return;
            }

            // CASE 2: Tiêu đề dài -> Cắt tỉa thông minh
            const lowerSubject = subject.toLowerCase();
            const lowerQuery = query.toLowerCase();
            const index = lowerSubject.indexOf(lowerQuery);

            if (index !== -1) {
                // Lấy từ vị trí khớp lùi lại một chút (để thấy ngữ cảnh trước đó)
                // Ví dụ query "truy cập", subject "...báo cáo về việc truy cập server..."
                // start lấy lùi lại 10 ký tự để user hiểu ngữ cảnh
                let start = Math.max(0, index - 10);

                // Nếu không phải bắt đầu từ đầu dòng, thêm dấu "..."
                let prefix = start > 0 ? '...' : '';

                // Cắt lấy tối đa 60 ký tự từ điểm start
                let cutStr = subject.substring(start, start + 60);

                // Xử lý cắt gọn từ cuối cùng để không bị đứt chữ (ví dụ "truy cậ")
                const lastSpaceIndex = cutStr.lastIndexOf(' ');
                if (lastSpaceIndex > index - start + query.length) {
                    cutStr = cutStr.substring(0, lastSpaceIndex);
                }

                suggestions.add(`${prefix}${cutStr}...`);
            }
        });

        // C. Sắp xếp: Ưu tiên chuỗi ngắn hơn (thường là kết quả chính xác hơn)
        return Array.from(suggestions)
            .sort((a, b) => a.length - b.length)
            .slice(0, 5);
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
