import dotenv from "dotenv";
dotenv.config();

import sqlize from "sequelize";
const { Sequelize } = sqlize;

const pgConnectionUri = process.env.DB_CONNECTION_URL as string;
const sequelize = new Sequelize(pgConnectionUri, {
  dialect: `postgres`,
  logging: false,
});

export default sequelize;
