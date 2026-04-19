import { User } from '../entities';
import { CognitoUserService } from '../services/cognito-user/cognito-user.service';
import { UserService } from '../services/user/user.service';

export class CreateDbUserFacade {
    constructor(private cognitoUserService: CognitoUserService, private userService: UserService) {}

    async createDbUserFromCognitoSub(sub: string): Promise<User> {
        const cognitoUser = await this.cognitoUserService.getUserBySub(sub);
        const userEntity = await this.userService.getUserByEmail(cognitoUser?.profile.email ?? '');
        if (userEntity) {
            return userEntity; // Return existing user if found
        }

        const userToAdd = new User();
        userToAdd.email = cognitoUser?.profile.email ?? '';
        userToAdd.full_name = cognitoUser?.profile.name ?? '';
        userToAdd.sso_id = sub;
        userToAdd.is_active = true;

        const user = await this.userService.addUser(userToAdd);
        return user;
    }
}
