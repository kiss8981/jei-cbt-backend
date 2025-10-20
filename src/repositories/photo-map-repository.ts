import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PhotoMap } from 'src/entities/photo-map.entity';

@Injectable()
export class PhotoMapRepository {
  constructor(
    @InjectRepository(PhotoMap)
    private readonly photoMapRepository: Repository<PhotoMap>,
  ) {}

  async create(photoMap: Partial<PhotoMap>) {
    const newPhotoMap = this.photoMapRepository.create(photoMap);
    return this.photoMapRepository.save(newPhotoMap);
  }

  async updateByKey(key: string, updateData: Partial<PhotoMap>) {
    return this.photoMapRepository.update({ key }, updateData);
  }

  async findByQuestionId(questionId: number) {
    return this.photoMapRepository.find({ where: { questionId } });
  }

  async deleteByKey(key: string) {
    return this.photoMapRepository.softDelete({ key });
  }
}
