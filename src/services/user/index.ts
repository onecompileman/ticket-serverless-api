import { DatabaseClient } from "../../libs/db/database-client";
import { UserService } from "./user.service";

export const userService = new UserService(new DatabaseClient());
