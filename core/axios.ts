import axios from 'axios';
import { parseCookies } from "nookies";

const cookie = parseCookies()

const Axios = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    Authorization: 'Bearer ' + cookie?.token,
  },
});

export { Axios };
