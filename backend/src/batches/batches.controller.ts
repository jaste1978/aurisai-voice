import {
  Controller, Get, Post, Body, Param, UseGuards,
  ParseIntPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { BatchesService } from './batches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as path from 'path';
import * as os from 'os';

const uploadOptions = {
  storage: diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`),
  }),
};

@Controller('batches')
@UseGuards(JwtAuthGuard)
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Get()
  async findAll() {
    const data = await this.batchesService.findAll();
    return { success: true, data };
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseIntPipe) id: number) {
    return this.batchesService.getStatus(id);
  }

  @Get(':id/executions')
  async getExecutions(@Param('id', ParseIntPipe) id: number) {
    return this.batchesService.getExecutions(id);
  }

  @Post(':id/stop')
  async stop(@Param('id', ParseIntPipe) id: number) {
    return this.batchesService.stop(id);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.batchesService.previewCSV(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async create(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) throw new Error('No file uploaded');
    return this.batchesService.create(file, body);
  }
}
