import { DataSource } from 'typeorm';
import { dataSource } from './data-source';

export class DatabaseClient {
  constructor() {}

  public async initialize(): Promise<DataSource> {
    let connection: DataSource;
    
    const datasource = (await dataSource) as DataSource;

    if (datasource.isInitialized) {
      console.log('Reusing same connection');
      connection = await datasource.manager.connection;
    } else {
      console.log('Creating new connection');
      connection = await datasource.initialize();
    }

    return connection;
  }
}
