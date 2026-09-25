import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

loadEnv();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'backend_template',
    entities: [User],
    synchronize: false,
  });

  await dataSource.initialize();

  const usersRepository = dataSource.getRepository(User);
  const adminEmail = 'admin@example.com';

  const existing = await usersRepository.findOne({
    where: { email: adminEmail },
  });

  if (!existing) {
    const admin = usersRepository.create({
      name: 'Admin User',
      email: adminEmail,
      password: await bcrypt.hash('AdminPass123!', 12),
      role: Role.ADMIN,
      isActive: true,
    });
    await usersRepository.save(admin);
    console.log('Seeded admin user: admin@example.com / AdminPass123!');
  } else {
    console.log('Admin user already exists, skipping seed');
  }

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
