import { connect } from 'http2';
import { DatabaseClient } from '../libs/db/database-client';
import { Repository, ObjectLiteral, DataSource } from 'typeorm';

export abstract class BaseDatabaseService<T extends ObjectLiteral> {
    protected entityClass!: { new (): T };
    protected connection!: DataSource;

    constructor(protected readonly databaseClient: DatabaseClient) {}

    protected async getRepositoryAsync(): Promise<Repository<T>> {
        if (this.connection) {
            return this.connection.getRepository<T>(this.entityClass);
        }
        console.log('Initializing database connection...');
        this.connection = await this.databaseClient.initialize();
        return this.connection.getRepository<T>(this.entityClass);
    }
}
