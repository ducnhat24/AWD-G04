import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { KanbanConfig, KanbanConfigDocument } from './entities/kanban-config.entity';
import { UpdateKanbanConfigDto } from './dto/update-kanban.dto';
import { CreateKanbanConfigDto } from './dto/create-kanban.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

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
  // --- 1. Sửa createConfig để tự động gắn UUID ---
  async createConfig(userId: string, createDto?: CreateKanbanConfigDto) {
    let config = await this.kanbanModel.findOne({ userId });

    // Helper sinh cột có UUID
    const processColumns = (cols: any[]) => {
      return cols.map(col => ({
        ...col,
        id: col.id || uuidv4() // Nếu Frontend không gửi ID, Backend tự sinh
      }));
    };

    if (!config) {
      const columnsToSave = (createDto && createDto.columns && createDto.columns.length > 0)
        ? processColumns(createDto.columns)
        : this.getDefaultColumns(); // Default columns cũng đã có UUID

      config = new this.kanbanModel({
        userId,
        columns: columnsToSave
      });
      return config.save();
    }

    // Logic Append cột mới
    if (createDto && createDto.columns && createDto.columns.length > 0) {
      const existingIds = new Set(config.columns.map(col => col.id));

      // Lọc cột mới & Gán UUID cho chúng
      const newColumnsToAdd = createDto.columns
        .filter(col => !col.id || !existingIds.has(col.id))
        .map(col => ({
          ...col,
          id: col.id || uuidv4()
        }));

      if (newColumnsToAdd.length > 0) {
        config.columns.push(...newColumnsToAdd);
        return config.save();
      }
    }
    return config;
  }

  // --- 2. UPDATE MỘT CỘT CỤ THỂ (Theo ID) ---
  async updateColumn(userId: string, columnId: string, updateDto: UpdateColumnDto) {
    // Kỹ thuật MongoDB: Array Filters ("columns.$.field")
    // Tìm document của user có chứa columnId
    // Update chính xác phần tử đó trong mảng

    // Tạo object update dynamic (chỉ update những field gửi lên)
    const updateFields = {};
    for (const key in updateDto) {
      if (updateDto[key] !== undefined) {
        updateFields[`columns.$.${key}`] = updateDto[key];
      }
    }

    const updatedConfig = await this.kanbanModel.findOneAndUpdate(
      { userId, "columns.id": columnId }, // Điều kiện: User đúng VÀ có cột ID này
      { $set: updateFields },
      { new: true }
    );

    if (!updatedConfig) {
      throw new NotFoundException(`Không tìm thấy cột có ID ${columnId} để cập nhật`);
    }
    return updatedConfig;
  }

  async updateConfig(userId: string, updateDto: UpdateKanbanConfigDto) {
    return this.kanbanModel.findOneAndUpdate(
      { userId },
      { $set: { columns: updateDto.columns } },
      { new: true, upsert: true }
    );
  }

  // --- 3. DELETE MỘT CỘT CỤ THỂ (Theo ID) ---
  async deleteColumn(userId: string, columnId: string) {
    const updatedConfig = await this.kanbanModel.findOneAndUpdate(
      { userId },
      { $pull: { columns: { id: columnId } } }, // $pull: Rút phần tử ra khỏi mảng
      { new: true }
    );

    // Kiểm tra xem thực sự có xóa được không (optional)
    // Cần cẩn trọng nếu xóa cột hệ thống, nhưng ở đây ta cho phép xóa theo ID
    return updatedConfig;
  }

  // --- 4. Xóa toàn bộ Config (Giữ nguyên) ---
  async deleteConfig(userId: string) {
    // ... code cũ
    const deletedConfig = await this.kanbanModel.findOneAndDelete({ userId });
    if (!deletedConfig) {
      throw new NotFoundException('Người dùng này chưa có cấu hình Kanban để xóa!');
    }
    return {
      message: 'Đã xóa cấu hình Kanban thành công',
      deletedId: deletedConfig._id
    };
  }

  // Cập nhật Default Columns dùng UUID
  private getDefaultColumns() {
    return [
      {
        id: uuidv4(),
        title: 'Hộp thư đến',
        gmailLabelId: 'INBOX',
        color: '#3b82f6',
        order: 0
      },
      {
        id: uuidv4(),
        title: 'Cần làm',
        gmailLabelId: 'TODO',
        color: '#eab308',
        order: 1
      },
      {
        id: uuidv4(),
        title: 'Đã xong',
        gmailLabelId: 'DONE',
        color: '#22c55e',
        order: 2
      },
      {
        id: uuidv4(),
        title: 'Snoozed',
        gmailLabelId: 'SNOOZED',
        color: '#22c55e',
        order: 3
      }
    ];
  }

  // Hàm createDefaultConfig cũng update tương tự...
  private async createDefaultConfig(userId: string) {
    const defaultConfig = new this.kanbanModel({
      userId,
      columns: this.getDefaultColumns() // Tái sử dụng hàm trên cho gọn
    });
    return defaultConfig.save();
  }
}