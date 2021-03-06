const dotenv = require("dotenv");
import bcrypt from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { getManager } from "typeorm";
import { Request, Response } from "express";

import { RegisterValidation } from "./../validations/register.validation";
import { User } from "../entity/user.entity";

dotenv.config();

export const Register = async (req: Request, res: Response) => {
  const body = req.body;

  // validation islemimizi bodyden gelen bilgilerle belirledigimiz kurallara uyup uymadigini kontrol ediyoruz. {error} yerine validation da yazabilirdik ancak destructing uygulayip sadece hata olma durumunu aliyoruz bu sekilde.
  const { error } = RegisterValidation.validate(body); // it returns a boolean

  if (error) {
    return res.status(400).send(error.details);
  }
  if (body.password !== body.password_confirm) {
    return res.status(400).send({
      message: "Password do not match",
    });
  }

  //   entity icerisinde user schema mizi olusturduktan sonra verileri Registerdan cekebilmek icin getManager().getRepository() ile fonksiyonu schemamiza ulasiyoruz.
  const repository = getManager().getRepository(User);
  const { password, ...user } = await repository.save({
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email,
    password: await bcrypt.hash(body.password, 8),
  });

  res.send(user);
};

export const Login = async (req: Request, res: Response) => {
  const repository = getManager().getRepository(User);
  const user = await repository.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).send({
      message: "Password or Email is not correct!",
    });
  }
  const userPassword = await bcrypt.compare(req.body.password, user.password);
  if (!userPassword) {
    return res
      .status(400)
      .send({ message: "Password or Email is not correct!" });
  } else {
    //  crearte jwt start point
    const payload = {
      id: user.id,
    };
    const token = sign(payload, process.env.SECRET_KEY);

    // save jwt into the cookie
    //  cookie is not enabled on frontend side (client) for that we have to add credentials: true inside the app.use(cors{...})

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, //miliseconds
    });
    const { password, ...data } = user;
    return res.status(200).send(data);
  }
};

// AuthanticatedUser Start Point
export const AuthanticatedUser = async (req: Request, res: Response) => {
  const { password, ...user } = req["user"];
  res.send(user);
};

export const Logout = async (req: Request, res: Response) => {
  res.clearCookie("jwt");
  //   res.cookie("jwt", "", { maxAge: 0 });
  res.send({ message: "Successfully loged out" });
//   console.log(req.cookies);
};

export const UpdateInfo = async (req: Request, res: Response) => {
  const user = req["user"];

  const repository = getManager().getRepository(User);

  await repository.update(user.id, req.body);

  const {password, ...data} = await repository.findOne(user.id)

  res.send(data)
};

export const UpdatePassword = async (req: Request, res: Response) => {
    const user = req["user"];


  if (req.body.password !== req.body.password_confirm) {
    return res.status(400).send({
      message: "Password don not match",
    });
  }
  const repository = getManager().getRepository(User);
  await repository.update(user.id, {
      password: await bcrypt.hash(req.body.password, 8)
  })
  const {password, ...data} = user;

  res.send(data);


}
