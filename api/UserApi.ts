import {UserData} from "../pages";
import {AxiosInstance} from "axios";

export const UserApi = (instance: AxiosInstance) => {
  return {
    getMe: async (): Promise<UserData> => {
      const { data } = await instance.get('/auth/me');
      console.log(data, 'USER API')
      return data;
    },
  }
};
