import { cognitoClient } from "../../libs/auth/cognito-client";
import { CognitoUserService } from "./cognito-user.service";

export const cognitoUserService  = new CognitoUserService(
    cognitoClient,
    'ap-southeast-2_ANIUcWB9u'
);