import { TicketBoard, TicketBoardUser, User } from "../../entities";
import { DatabaseClient } from "../../libs/db/database-client";
import { BaseDatabaseService } from "../base-database.service";

export class UserService extends BaseDatabaseService<User> {

    protected entityClass: new () => User = User;

    constructor(
        databaseClient: DatabaseClient
    ) {
        super(databaseClient);
    }

    async getAllUsers(): Promise<User[]> {
        const userRepository = await this.getRepositoryAsync();
        return userRepository.find();
    }

    async addUser(user: User): Promise<User> {
        const userRepository = await this.getRepositoryAsync();
        return await userRepository.save(user);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const userRepository = await this.getRepositoryAsync();
        return await userRepository.findOneBy({ email }); 
    }

    async getUsersByBoardId(boardId: number): Promise<User[]> {
        const dataSource = await this.databaseClient.initialize();
        const ticketBoardUserRepository = dataSource.getRepository(TicketBoardUser);

        const ticketBoardUsers = await ticketBoardUserRepository.find({
            where: { board: { id: boardId } },
            relations: ['user'],
            order: { id: 'ASC' },
        });

        return ticketBoardUsers.map((ticketBoardUser) => ticketBoardUser.user);
    }
}