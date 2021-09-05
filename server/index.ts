import express from 'express';
import dotenv from 'dotenv';
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import {nanoid} from "nanoid";
import cors from 'cors';
import {passport} from './core/passport';
import {Code} from '../models'

import {UserData} from "../pages";
import {Axios} from "../core/axios";

import './core/db'

declare global {
  namespace Express {
    interface User extends UserData {
    }
  }
}

dotenv.config({
  path: './server/.env',
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

const uploader = multer({
  storage: multer.diskStorage({
    destination: function (_, __, cb) {
      cb(null, './public/avatars/')
    },
    filename: function (_, file, cb) {
      cb(null, file.fieldname + '-' + nanoid(6) + '.' + file.mimetype.split('/').pop());
    },
  })
});

const randomCode = (max: number = 9999, min: number = 1000) => Math.floor(Math.random() * (max - min + 1)) + min;

app.post('/upload', uploader.single('photo'), (req, res) => {
  const filePath = req.file.path;
  sharp(filePath)
    .resize(150, 150)
    .toFormat('jpeg')
    .toFile(filePath.replace('.png', '.jpeg'), (err) => {
      if (err) {
        throw err
      }

      fs.unlinkSync(filePath);

      res.json({
        url: `/avatars/${req.file.filename.replace('.png', '.jpeg')}`,
      });
    });
});

app.get('/auth/me', passport.authenticate('jwt', {session: false}), (req, res) => {
  res.json(req.user);
});

app.get('/auth/sms/activate', passport.authenticate('jwt', {session: false}), async (req, res) => {
  const userId = req.user.id;
  const smsCode = req.query.code;

  if (!smsCode) {
    return res.status(400).send();
  }

  const whereQuery = {code: smsCode, user_id: userId};

  try {
    const findCode = await Code.findOne({
      where: whereQuery,
    });

    if (findCode) {
      await Code.destroy({
        where: whereQuery,
      });
      return res.send();
    } else {
      throw new Error('User not found');
    }

  } catch (error) {
    res.status(500).json({
      message: 'Error sending sms(Ошибка при активации аккаунта)',
    })
  }
});

app.get('/auth/sms', passport.authenticate('jwt', {session: false}), async (req, res) => {
  const phone = req.query.phone;
  const userId = req.user.id;
  const smsCode = randomCode();

  if (!phone) {
    return res.status(400).send('not valid code');
  }
  try {
    // await Axios.get(
    //   `https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}&to=79892611371&msg=${smsCode}`,
    //   );

    await Code.create({
      code: smsCode,
      user_id: userId,
    });

    res.status(201).send();
  } catch (error) {
    res.status(500).json({
      message: 'Error sending sms(Ошибка при отправке)',
    })
  }
});

app.get('/auth/github', passport.authenticate('github'));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', {failureRedirect: '/login'}),
  (req, res) => {
    res.send(
      `<script>window.opener.postMessage('${JSON.stringify(
        req.user,
      )}', '*');window.close();</script>`,
    );
  },
);

app.listen(3001, () => {
  console.log('Server RUNNED!')
});
