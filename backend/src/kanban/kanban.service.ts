import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KanbanConfig, KanbanConfigDocument } from './entities/kanban-config.entity';
import { UpdateKanbanConfigDto } from './dto/update-kanban.dto';
import { CreateKanbanConfigDto } from './dto/create-kanban.dto';

@Injectable()
export class KanbanService {
  constructor(
    @InjectModel(KanbanConfig.name) private kanbanModel: Model<KanbanConfigDocument>,
  ) { }

  // Lấy config, nếu chưa có thì tạo Default
  async getConfig(userId: string) {
    let config = await this.kanbanModel.findOne({ userId });

    if (!config) {
      config = await this.createDefaultConfig(userId);
    }

    // Sort cột theo order trước khi trả về
    config.columns.sort((a, b) => a.order - b.order);
    return config;
  }

  // Update lại toàn bộ board (khi kéo thả cột, đổi tên, đổi màu)
  async updateConfig(userId: string, updateDto: UpdateKanbanConfigDto) {
    return this.kanbanModel.findOneAndUpdate(
      { userId },
      { $set: { columns: updateDto.columns } },
      { new: true, upsert: true } // Trả về data mới nhất
    );
  }

  async createConfig(userId: string, createDto?: CreateKanbanConfigDto) {
    // 1. Tìm config hiện tại
    let config = await this.kanbanModel.findOne({ userId });

    // CASE A: Chưa có config nào -> Tạo mới hoàn toàn
    if (!config) {
      const columnsToSave = (createDto && createDto.columns && createDto.columns.length > 0)
        ? createDto.columns
        : this.getDefaultColumns();

      config = new this.kanbanModel({
        userId,
        columns: columnsToSave
      });
      return config.save();
    }

    // CASE B: Đã có config -> Thực hiện logic "Thêm cột" (Append)
    if (createDto && createDto.columns && createDto.columns.length > 0) {
      // Lấy danh sách ID các cột đang có để check trùng
      const existingIds = new Set(config.columns.map(col => col.id));

      // Chỉ lấy những cột MỚI (có ID chưa nằm trong DB)
      const newColumnsToAdd = createDto.columns.filter(col => !existingIds.has(col.id));

      if (newColumnsToAdd.length > 0) {
        // Thêm cột mới vào cuối mảng
        config.columns.push(...newColumnsToAdd);

        // (Tuỳ chọn) Bạn có thể sort lại order nếu muốn logic đó
        // config.columns.sort((a, b) => a.order - b.order);

        return config.save();
      }
    }

    // Nếu không có gì mới để thêm, trả về config hiện tại (Idempotent)
    return config;
  }

  async deleteConfig(userId: string) {
    const deletedConfig = await this.kanbanModel.findOneAndDelete({ userId });

    if (!deletedConfig) {
      throw new NotFoundException('Người dùng này chưa có cấu hình Kanban để xóa!');
    }

    return {
      message: 'Đã xóa cấu hình Kanban thành công',
      deletedId: deletedConfig._id
    };
  }

  // Config mặc định cho người dùng mới
  private async createDefaultConfig(userId: string) {
    const defaultConfig = new this.kanbanModel({
      userId,
      columns: [
        {
          id: 'col_inbox',
          title: 'Hộp thư đến',
          gmailLabelId: 'INBOX',
          color: '#3b82f6', // Xanh dương
          order: 0
        },
        {
          id: 'col_todo',
          title: 'Cần làm',
          gmailLabelId: 'TODO', // Lưu ý: Backend phải đảm bảo label này đã được tạo bên Gmail Service
          color: '#eab308', // Vàng
          order: 1
        },
        {
          id: 'col_done',
          title: 'Đã xong',
          gmailLabelId: 'DONE',
          color: '#22c55e', // Xanh lá
          order: 2
        }
      ]
    });
    return defaultConfig.save();
  }

  private getDefaultColumns() {
    return [
      {
        id: 'col_inbox',
        title: 'Hộp thư đến',
        gmailLabelId: 'INBOX',
        color: '#3b82f6',
        order: 0
      },
      {
        id: 'col_todo',
        title: 'Cần làm',
        gmailLabelId: 'TODO',
        color: '#eab308',
        order: 1
      },
      {
        id: 'col_done',
        title: 'Hoàn thành',
        gmailLabelId: 'DONE',
        color: '#22c55e',
        order: 2
      }
    ];
  }
}