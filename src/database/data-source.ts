import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from '../modules/users/entities/user.entity';

loadEnv();

const isCompiled = __filename.endsWith('.js');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'backend_template',
  ssl: ['true', '1', 'yes'].includes(
    (process.env.DATABASE_SSL || 'false').toLowerCase(),
  )
    ? { rejectUnauthorized: false }
    : false,
  entities: [User],
  migrations: [
    isCompiled
      ? __dirname + '/migrations/*.js'
      : __dirname + '/migrations/*{.ts,.js}',
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
